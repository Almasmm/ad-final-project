## Performance & Optimization Toolkit

This project ships with both HTTP-level load tests (Artillery) and node-based micro-benchmarks
that exercise the recommendation engine and catalog search stack directly against MongoDB.
Use this document as the single reference for setup and reporting expectations.

### 1. Prerequisites

- `MONGO_URI` must point to a running MongoDB instance with write permissions.
- Seed representative data before running any test harness: `npm run seed`.
- (Optional) rebuild the similarity matrix so recommendation calls use up-to-date neighbors:
  `npm run batch:sims`.

### 2. Load testing the recommendation API

Artillery scenario: `perf/perf-recommendations.yml`

```
# runs seed + load test by default
npm run perf:artillery
```

Environment knobs:

- `PERF_BASE_URL` - override the default `http://localhost:3000` target.
- `HTTP_MAX_SOCKETS` - tune Node's global HTTP/HTTPS agent pool size (default `500`) to prevent `ECONNREFUSED` under load.
- `MONGO_URI`, `SESSION_SECRET`, etc. via `.env`.

The default phase config (3 → 10 arrivals/sec) is sized for laptop hardware. Increase the arrival
rates only after verifying that your machine and Mongo instance can keep up.

The scenario signs in as a seeded admin (`elena.ivanova@atelier.ru`) and repeatedly hits:

1. `POST /auth/login`
2. `GET /api/recommendations/:userId`
3. `GET /recommend/user/:id`

Latency and throughput are reported by Artillery in addition to the expectation checks that
ensure successful responses. Keep the API server console visible while the load test runs so you
can spot resource warnings (e.g., EMFILE, ECONNRESET) in real time.

### 3. Node.js micro-benchmarks

Scripts live under `tests/performance/` and emit JSON reports to
`tests/performance/results/*.json` (ignored by git). Each script shares a summary schema
containing min/max/avg and percentile metrics to make regressions easy to track.

| Command                              | Description                                                                                             |
|--------------------------------------|---------------------------------------------------------------------------------------------------------|
| `npm run perf:reco`                 | Calls `computePersonalRecommendations` for N users and measures the server-side compute time only.     |
| `npm run perf:search`               | Executes repeated text-search queries to validate catalog latency.                                     |
| `npm run perf:indexes`              | Drops the `name_text_description_text` index, measures search, recreates the index, measures again.    |
| `npm run perf:all`                  | Convenience helper that runs the three scripts sequentially.                                           |

To overwrite a single rolling report instead of creating timestamped files, set one of:

- `PERF_REPORT_RECO`
- `PERF_REPORT_SEARCH`
- `PERF_REPORT_INDEX`

Example: `PERF_REPORT_RECO=reco_latest.json npm run perf:reco`.

Parameters (`.env` or inline when invoking):

- `PERF_RECO_SAMPLE` (default `200`), `PERF_RECO_LIMIT` – adjust recommendation test size.
- `PERF_SEARCH_TERMS` – comma-separated list of catalog queries (shared by all search tests).
- `PERF_SEARCH_ITERATIONS`, `PERF_INDEX_ITERATIONS` – number of query iterations.

Each benchmark prints a console summary and saves detailed series data with timestamps for
trend analysis tools such as Excel, Looker Studio, or custom dashboards.

Notes:

- The index benchmark uses a case-insensitive regex query after dropping the text index (slow, no index) and `$text` queries once the index is recreated, so it never fails with “text index required”.

### 4. Data-model optimizations (key indexes & caching)

| Area          | Optimization                                                                 | Reference |
|---------------|------------------------------------------------------------------------------|-----------|
| Users         | Unique email, role, segment, interest, and refresh token indexes accelerate profile lookups. | `src/models/User.js` lines 45-50 |
| Products      | Compound text index `(name, description)` plus category/price and tag indexes keep search/filter latency low. | `src/models/Product.js` lines 21-24 |
| Interactions  | `(userId, ts)` and `(productId, userId)` indexes backfill both history queries and similarity builds. | `src/models/Interaction.js` lines 12-14 |
| Orders/History| Time-sorted indexes on `userId` and `timestamp` feed `/api/users/:id/history` and dashboards. | `src/models/Order.js`, `src/models/UserHistory.js` |
| Recommendations| `ItemSimilarity` table caches the offline cosine similarity scores (built via `npm run batch:sims`). | `src/models/ItemSimilarity.js`, `src/scripts/build_sims.js` |
| User caching  | `User.cachedRecommendations` stores the last generated list to prevent repeated scoring when interactions are unchanged. | `src/models/User.js` & `computePersonalRecommendations` |

### 5. MongoDB profiler workflow

To capture slow queries during load tests:

1. Enable profiling with a tight slow threshold:
   ```js
   db.setProfilingLevel(1, { slowms: 25 });
   ```
2. Run either the Artillery scenario or the Node benchmarks.
3. Inspect and archive the entries:
   ```js
   db.system.profile
     .find({ ns: /products|interactions|user_history/ })
     .sort({ ts: -1 })
     .limit(10)
     .pretty();
   ```
4. Disable profiling afterwards:
   ```js
   db.setProfilingLevel(0);
   ```

Pair these snapshots with `db.collection.explain('executionStats')` to confirm that the
expected indexes are being used (`winningPlan.inputStage.indexName` should reference the
indexes documented above).

### 6. Reporting expectations

- Commit the JSON reports produced by CI (if desired) or store them in your observability stack.
- Keep an eye on:
  - Recommendation compute average ≤ 25 ms with the seeded dataset.
  - Text search P95 ≤ 15 ms with indexes enabled; degradation without indexes should be clearly
    visible in `db_indexes_test`.
  - Artillery throughput ≥ 25 RPS sustained with ≤ 200 ms median latency.

If any target regresses, profile again using the steps above, confirm indexes via
`collection.getIndexes()`, and rerun `npm run batch:sims` to refresh similarity data before
shipping.
