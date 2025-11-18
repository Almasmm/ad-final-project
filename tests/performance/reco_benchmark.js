require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');

const { connectDB } = require('../../src/config/db');
const User = require('../../src/models/User');
const { computePersonalRecommendations } = require('../../src/controllers/api');
const { calcSummary, writeReport } = require('./utils');

const SAMPLE_SIZE = Number(process.env.PERF_RECO_SAMPLE || 200);
const RECO_LIMIT = Number(process.env.PERF_RECO_LIMIT || 20);

async function main() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is not set. Provide a connection string to run benchmarks.');
    }

    await connectDB(uri);
    const users = await User.find({})
        .select('_id')
        .limit(SAMPLE_SIZE)
        .lean();

    if (!users.length) {
        console.warn('[perf] No users found to benchmark.');
        return;
    }

    console.log(`[perf] Running recommendation benchmark for ${users.length} users (limit=${RECO_LIMIT}).`);
    const measurements = [];
    for (const doc of users) {
        const userId = String(doc._id);
        const started = process.hrtime.bigint();
        await computePersonalRecommendations(userId, RECO_LIMIT);
        const ended = process.hrtime.bigint();
        const durationMs = Number(ended - started) / 1e6;
        measurements.push({ userId, durationMs: Number(durationMs.toFixed(3)) });
    }

    const summary = calcSummary(measurements.map((entry) => entry.durationMs));
    console.log('[perf] Recommendation benchmark summary (ms):', summary);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = process.env.PERF_REPORT_RECO || `reco_benchmark-${timestamp}.json`;
    const reportPath = writeReport(
        filename,
        {
            type: 'recommendation-benchmark',
            createdAt: new Date().toISOString(),
            params: { sampleSize: SAMPLE_SIZE, recommendationLimit: RECO_LIMIT },
            summary,
            measurements,
        }
    );
    console.log(`[perf] Detailed report saved to ${path.relative(process.cwd(), reportPath)}`);
}

main()
    .catch((err) => {
        console.error('[perf] Recommendation benchmark failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.close();
        }
    });
