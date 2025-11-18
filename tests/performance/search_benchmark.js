require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

const { connectDB } = require('../../src/config/db');
const Product = require('../../src/models/Product');
const { calcSummary, writeReport } = require('./utils');

const ITERATIONS = Number(process.env.PERF_SEARCH_ITERATIONS || 100);
const TERMS = (process.env.PERF_SEARCH_TERMS || 'coffee,smart,wireless,ceramic,lighting,audio')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);

async function executeSearch(term) {
    const started = performance.now();
    await Product.find({ $text: { $search: term } }).limit(20).lean();
    const ended = performance.now();
    return ended - started;
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
    console.log(`[perf] Running search benchmark: ${ITERATIONS} iterations across ${TERMS.length} queries.`);

    const measurements = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const term = TERMS[i % TERMS.length];
        const durationMs = await executeSearch(term);
        measurements.push({
            query: term,
            durationMs: Number(durationMs.toFixed(3)),
        });
    }

    const summary = calcSummary(measurements.map((entry) => entry.durationMs));
    console.log('[perf] Search benchmark summary (ms):', summary);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = process.env.PERF_REPORT_SEARCH || `search_benchmark-${timestamp}.json`;
    const reportPath = writeReport(
        filename,
        {
            type: 'search-benchmark',
            createdAt: new Date().toISOString(),
            params: { iterations: ITERATIONS, terms: TERMS },
            summary,
            measurements,
        }
    );

    console.log(`[perf] Detailed report saved to ${path.relative(process.cwd(), reportPath)}`);
}

main()
    .catch((err) => {
        console.error('[perf] Search benchmark failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.close();
        }
    });
