# Tenyz Market

Tenyz Market is a MongoDB-backed e-commerce playground that mixes classic catalog + cart flows with a collaborative-filtering recommendation service, server-rendered dashboards, REST APIs, and an Artillery-based performance lab. The codebase intentionally stays framework-light (Express + EJS) so students can trace every middleware, data-access pattern, and benchmark.

## Feature Highlights
- Full auth pipeline (registration, email verification, login, refresh tokens, logout, forgot/reset) with JWT-secured APIs plus session bridging for the EJS UI.
- Product catalog with faceted search, price/category filters, text indexes, wishlist management, carts, checkout, and order history.
- Item-based collaborative filtering: offline similarity builds (`npm run batch:sims`), cached recommendation lists, `/api/recommendations/:userId`, and `/api/products/:id/similar`.
- Admin tools (user management, similarity rebuild, Artillery hooks) and seeded sample data with deterministic IDs so demos are reproducible.
- Performance toolkit: curated dataset seeder, synthetic data generator, Artillery scenario, and three Node-based micro-benchmarks with JSON result artifacts.
- Accessible Bootstrap 5 UI living in `src/views`/`src/public`, wired to the REST API through `src/public/js/app.js`.

## Tech Stack
- **Backend:** Node.js, Express 5, Mongoose, express-session, morgan, cors, zod.
- **Auth & Security:** JWT, bcrypt, express-session, Nodemailer (SMTP or console fallback).
- **Views:** EJS + express-ejs-layouts + Bootstrap 5, vanilla JS client helpers.
- **Data:** MongoDB with compound/text indexes, ItemSimilarity cache, carts, orders, user history.
- **Docs & Tooling:** swagger-jsdoc + swagger-ui-express, Artillery, nodemon.

## Directory Layout
```text
.
|-- docs/                    # Additional documentation (performance guide, etc.)
|-- perf/                    # Artillery scenarios and helper assets
|-- src/
|   |-- config/              # DB + Swagger config
|   |-- controllers/         # REST + auth + cart logic
|   |-- middleware/          # Auth guards
|   |-- models/              # Mongoose schemas (users, products, carts, orders, etc.)
|   |-- public/              # Static JS/CSS served to the EJS pages
|   |-- routes/              # Express routers (auth, products, cart, orders, etc.)
|   |-- scripts/             # Seeders, similarity builder, fake data generator
|   `-- views/               # EJS pages (catalog, auth, account, admin)
|-- tests/performance/       # Micro-benchmarks + JSON result folder
|-- package.json / lock      # npm metadata + scripts
`-- LICENSE                  # ISC license
```

## Prerequisites
- Node.js 18+ (tested with Node 20) and npm 9+.
- MongoDB 6+ running locally or reachable via `MONGO_URI`.
- Optional: SMTP credentials (for actual emails) and Artillery installed globally if you want to run `artillery` manually.

## Environment Variables
Create a `.env` in the project root. All values have sensible defaults for local dev, but set them explicitly for predictable behavior.

### Core Server
| Variable | Description |
| --- | --- |
| `PORT` | HTTP port for Express (defaults to `3000`). |
| `MONGO_URI` | MongoDB connection string (required). |
| `NODE_ENV` | `development` / `production` toggles stricter auth settings. |
| `SESSION_SECRET` | Secret for `express-session` (required for UI sessions). |
| `HTTP_MAX_SOCKETS` | Caps Node's global HTTP/HTTPS agent sockets (default `500`). |

### Auth & User Limits
| Variable | Description |
| --- | --- |
| `JWT_SECRET` | Used to sign API tokens. |
| `ACCESS_TTL` | Access token lifetime (e.g., `15m`). |
| `REFRESH_TTL_DAYS` | Refresh token lifetime (default `30`). |
| `MAX_REFRESH_TOKENS` | Rotate + cap stored refresh tokens per user. |
| `RESET_TTL_MINUTES` | Reset / verification code validity window. |
| `MIN_PASSWORD_LENGTH` | Client + server password length validation. |
| `USER_VIEW_HISTORY_LIMIT` | Max items preserved in `User.viewHistory`. |
| `USER_PURCHASE_HISTORY_LIMIT` | Max purchase log entries. |
| `USER_RECO_CACHE_LIMIT` | Cap cached recommendation list size. |

### Mailer
| Variable | Description |
| --- | --- |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE` | SMTP host/port/secure flag. |
| `MAIL_USER`, `MAIL_PASS` | SMTP credentials. |
| `MAIL_FROM` | From email used in verification/reset messages. |
> If SMTP env vars are omitted, codes are logged to the console instead.

### Performance & Data Generation
| Variable | Description |
| --- | --- |
| `PERF_BASE_URL` | Override Artillery target (defaults to `http://localhost:3000`). |
| `PERF_RECO_SAMPLE`, `PERF_RECO_LIMIT` | Control `npm run perf:reco`. |
| `PERF_SEARCH_TERMS`, `PERF_SEARCH_ITERATIONS` | Control search benchmark queries. |
| `PERF_INDEX_ITERATIONS` | Control DB index benchmark workloads. |
| `PERF_REPORT_RECO`, `PERF_REPORT_SEARCH`, `PERF_REPORT_INDEX` | File names for JSON reports (default timestamp per run). |
| `FAKE_USERS`, `FAKE_PRODUCTS`, `FAKE_MIN_INTERACTIONS`, `FAKE_MAX_INTERACTIONS` | Overrides for the synthetic data generator. |

### Sample `.env`
```ini
PORT=3000
MONGO_URI=mongodb://localhost:27017/tenyz-market
SESSION_SECRET=change-me
JWT_SECRET=super-secret
HTTP_MAX_SOCKETS=500
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey
MAIL_PASS=super-secret
MAIL_FROM=Tenyz Market <noreply@tenyz.test>
```

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment**
   - Copy the sample snippet above into `.env` and tweak for your machine.
   - Make sure MongoDB is running and accessible via `MONGO_URI`.
3. **Seed curated demo data**
   ```bash
   npm run seed
   ```
   This loads 100% deterministic products, users, carts, orders, and similarity rows that mirror the scenario in `docs/performance.md`.
4. **Build similarity vectors (optional but recommended)**
   ```bash
   npm run batch:sims
   ```
   You can also trigger this from the Admin UI or POST `/admin/rebuild-sims` (admin role + JWT required).
5. **Start the server**
   ```bash
   npm run dev   # nodemon
   # or
   npm start     # plain node
   ```
6. Visit `http://localhost:3000/` for the UI and `http://localhost:3000/docs` for Swagger docs.

## npm Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start Express with nodemon autoreload. |
| `npm start` | Start Express once via `node src/index.js`. |
| `npm run seed` | Load curated sample dataset (users/products/interactions/orders). |
| `npm run batch:sims` | Offline cosine similarity rebuild (writes `ItemSimilarity`). |
| `npm run perf:artillery` | Seed + execute `perf/perf-recommendations.yml`. |
| `npm run perf:recommendations` | Alias for the Artillery scenario. |
| `npm run perf:reco` | Node benchmark for computePersonalRecommendations latency. |
| `npm run perf:search` | Node benchmark for catalog text search latency. |
| `npm run perf:indexes` | Drops/recreates text index to highlight perf delta. |
| `npm run perf:all` | Runs reco + search + index benchmarks sequentially. |

## Data & Recommendation Workflows
- **Seeding (`src/scripts/seed.js`):** Wipes collections, inserts curated products (coffee gear, smart home, hi-fi, etc.), creates carts/orders/interactions, and promotes `elena.ivanova@atelier.ru` to admin. Passwords default to `TasteTest#2024`.
- **Similarity builder (`src/scripts/build_sims.js`):** Consumes up to 12 months of interactions, weights event types (`view=1`, `like=3`, `add_to_cart=4`, `purchase=6`), computes cosine similarity, and updates `ItemSimilarity`.
- **Fake data generator (`src/scripts/gen_fake_data.js`):** Creates large random corpora for stress testing. Run `node src/scripts/gen_fake_data.js --users=2000 --products=1500` after setting `MONGO_URI`.
- **Caching:** `User.cachedRecommendations` stores the last recommendation payload so the UI can render instantly while async refreshes run.

## API Surface & Docs
- **Health:** `GET /ping` - uptime probe.
- **Auth (`/auth`):** register, verify/resend verification, login, refresh, logout, forgot, reset. Responses return user payloads + tokens for the UI to stash in `localStorage`.
- **Users (`/api/users`):** create profile, `GET /me`, `PATCH /me`, wishlist getter/deleter, admin-only list/update/delete, and owner-only `/api/users/:id/history`.
- **Products (`/api/products`):** list (search, filter, sort), get, create/update/delete (admin), and `/api/products/:id/bought-together`.
- **Interactions (`/api/interactions`):** records view/like/add_to_cart/purchase events (JWT required).
- **Cart (`/api/cart`):** get cart, add/increment `POST /items`, `PATCH /items/:productId`, `DELETE /items/:productId`.
- **Orders (`/api/orders`):** `POST /checkout` (creates order + purchase interactions) and `GET /me`.
- **Recommendations (`/api/recommendations/:userId`, `/api/products/:id/similar`):** personalized + similar product feeds. `/recommend/user/:id` bundles the API for UI use. Access to `/admin/rebuild-sims` is guarded by `requireRole('admin')`.
- **Session bridge:** `POST /_session/set` lets the UI sync JWT-derived identity into the server session for rendering guards.
- **Docs:** Swagger is auto-built from `src/routes/*.js` annotations and hosted at `/docs`.

Refer to `docs/performance.md` for deeper descriptions of indexes, profiling, and load expectations.

## Web UI
EJS pages live under `src/views`:
- `/` & `/search` - catalog search, filters, relevance-sorted cards.
- `/product/:id` - detail page with similar items.
- `/login`, `/register`, `/forgot`, `/reset`, `/verify` - auth flows; `src/public/js/app.js` handles validation, fetches, and token storage.
- `/me/history`, `/me/reco`, `/me/wishlist`, `/me/cart`, `/me/profile` - account center (history, recommendations, wishlist maintenance, cart editing, profile updates).
- `/admin` - rebuild similarity, inspect stats, manage background jobs (admin-only nav button).

`src/public/js/app.js` wires these screens to the REST API, keeps JWT/refresh tokens in `localStorage`, mirrors them to the Express session via `/_session/set`, and renders cart counts + flash alerts. Styles live in `src/public/css/app.css`.

## Performance & Testing
- `docs/performance.md` is the canonical reference for load/perf workflows, MongoDB profiling, and reporting expectations.
- `perf/perf-recommendations.yml` simulates: login -> `GET /api/recommendations/:userId` -> `GET /recommend/user/:id`. Adjust arrival rates or `PERF_BASE_URL` as needed.
- `tests/performance/*.js` house the micro-benchmarks. Results land in `tests/performance/results/*.json` (gitignored) and include min/avg/p95 metrics so you can trend regressions.
- Use `HTTP_MAX_SOCKETS` plus Mongo indexes (documented in `docs/performance.md`) to avoid connection exhaustion under load.

## Seeded Accounts
| Email | Role | Password |
| --- | --- | --- |
| `elena.ivanova@atelier.ru` | admin | `TasteTest#2024` |
| `marat.kadyrov@crafthouse.kz` | user | `TasteTest#2024` |
| `sofia.minaeva@dailyhome.ru` | user | `TasteTest#2024` |
| `ilya.stepanov@hifi.ua` | user | `TasteTest#2024` |
| `alina.ismailova@slowmorning.az` | user | `TasteTest#2024` |
| `kurban.mamedov@atelier.az` | user | `TasteTest#2024` |

> Change these credentials (or re-run the seed script) before deploying to any shared environment.

## Troubleshooting Tips
- **Mongo connection errors:** check `MONGO_URI` and ensure the user has write access; the app exits if the initial connection fails.
- **Cart/checkout returning 401:** the REST API requires a valid `Authorization: Bearer <token>` header; ensure the UI successfully synced its token via `/_session/set`.
- **Email not delivered:** missing SMTP env vars fall back to console logs. Configure `MAIL_*` to send real emails.
- **Similarity data feels stale:** run `npm run batch:sims` or use the Admin action; the `/api/recommendations` endpoint will otherwise serve cached entries.
- **Benchmark reports missing:** set `PERF_REPORT_*` to persistent filenames or collect the timestamped JSON in `tests/performance/results/`.

## License
Released under the ISC License. See `LICENSE` for details.
