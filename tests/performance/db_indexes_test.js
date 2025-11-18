require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

const { connectDB } = require('../../src/config/db');
const Product = require('../../src/models/Product');
const { calcSummary, writeReport } = require('./utils');

const ITERATIONS = Number(process.env.PERF_INDEX_ITERATIONS || 60);
const TERMS = (process.env.PERF_SEARCH_TERMS || 'coffee,smart,wireless,ceramic,lighting,audio')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
const TEXT_INDEX_NAME = 'name_text_description_text';

async function runSearchBatch(label, finder) {
    const measurements = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const term = TERMS[i % TERMS.length];
        const started = performance.now();
        await finder(term);
        const ended = performance.now();
        measurements.push({ query: term, durationMs: Number((ended - started).toFixed(3)) });
    }
    const summary = calcSummary(measurements.map((entry) => entry.durationMs));
    console.log(`[perf] ${label} summary (ms):`, summary);
    return { summary, measurements };
}

async function dropTextIndex() {
    try {
        await Product.collection.dropIndex(TEXT_INDEX_NAME);
        console.log(`[perf] Dropped text index: ${TEXT_INDEX_NAME}`);
    } catch (err) {
        if (err.codeName === 'IndexNotFound' || err.code === 27) {
            console.warn('[perf] Text index was not present; continuing.');
        } else {
            throw err;
        }
    }
}

async function ensureTextIndex() {
    await Product.collection.createIndex(
        { name: 'text', description: 'text' },
        { name: TEXT_INDEX_NAME }
    );
    console.log(`[perf] Ensured text index: ${TEXT_INDEX_NAME}`);
}

async function findWithRegex(term) {
    const regex = new RegExp(term, 'i');
    return Product.find({
        $or: [
            { name: regex },
            { description: regex },
        ],
    }).limit(20).lean();
}

async function findWithTextSearch(term) {
    return Product.find({ $text: { $search: term } }).limit(20).lean();
}

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is not set. Provide a connection string to run benchmarks.');
    }
    if (!TERMS.length) {
        throw new Error('PERF_SEARCH_TERMS did not produce any queries to run.');
    }

    await connectDB(uri);

    let report;
    try {
        await dropTextIndex();
        const withoutIndex = await runSearchBatch('Regex search (no text index)', findWithRegex);
        await ensureTextIndex();
        const withIndex = await runSearchBatch('Text search (with index)', findWithTextSearch);
        report = {
            type: 'index-benchmark',
            createdAt: new Date().toISOString(),
            params: { iterations: ITERATIONS, terms: TERMS },
            withoutIndex,
            withIndex,
        };
    } finally {
        // Always ensure index exists for the app.
        try {
            await ensureTextIndex();
        } catch (err) {
            console.error('[perf] Failed to recreate text index:', err);
        }
    }

    if (report) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = process.env.PERF_REPORT_INDEX || `db_indexes_test-${timestamp}.json`;
        const reportPath = writeReport(filename, report);
        console.log(`[perf] Index comparison saved to ${path.relative(process.cwd(), reportPath)}`);
    }
}

main()
    .catch((err) => {
        console.error('[perf] Index benchmark failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.close();
        }
    });
