const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'results');

function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    return OUTPUT_DIR;
}

function percentile(sortedValues, ratio) {
    if (!sortedValues.length) return 0;
    const pos = (sortedValues.length - 1) * ratio;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) return sortedValues[lower];
    const weight = pos - lower;
    return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
}

function calcSummary(values = []) {
    if (!values.length) {
        return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, value) => acc + value, 0);
    return {
        count: values.length,
        avg: sum / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: percentile(sorted, 0.5),
        p90: percentile(sorted, 0.9),
        p95: percentile(sorted, 0.95),
        p99: percentile(sorted, 0.99),
    };
}

function writeReport(filename, payload) {
    const dir = ensureOutputDir();
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return filePath;
}

module.exports = {
    ensureOutputDir,
    calcSummary,
    writeReport,
};
