require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { spawn } = require('child_process');

const { connectDB } = require('./config/db');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const interactionRoutes = require('./routes/interactions');
const orderRoutes = require('./routes/orders');
const recommendationRoutes = require('./routes/recommendations');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./config/swagger');
const authRoutes = require('./routes/auth');


// src/index.js (добавления к твоему файлу)
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const buildSimsScript = path.join(__dirname, 'scripts', 'build_sims.js');
let isRebuildingSims = false;

function runBuildSims() {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [buildSimsScript], {
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (chunk) => process.stdout.write(`[build_sims] ${chunk}`));
        child.stderr.on('data', (chunk) => process.stderr.write(`[build_sims] ${chunk}`));
        child.once('error', reject);
        child.once('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`build_sims exited with code ${code}`));
        });
    });
}

// EJS + public
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout');   // views/layout.ejs
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
}));

app.use((req, res, next) => {
    req.ctx = {
        userId: req.session.userId || null,
        email: req.session.email || null,
    };
    res.locals.userId = req.ctx.userId;
    res.locals.email = req.ctx.email;
    next();
});

// routes
app.use('/', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', recommendationRoutes); // /recommendations/:userId и /products/:id/similar
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/auth', authRoutes);

app.post('/admin/rebuild-sims', async (_req, res) => {
    if (isRebuildingSims) {
        return res.status(409).json({ ok: false, message: 'Rebuild already in progress' });
    }
    isRebuildingSims = true;
    try {
        await runBuildSims();
        res.json({ ok: true });
    } catch (err) {
        console.error('rebuild-sims error', err);
        res.status(500).json({ ok: false, message: err.message || 'Failed to rebuild similarities' });
    } finally {
        isRebuildingSims = false;
    }
});


// ======== PAGES (EJS) ========
app.get('/', (req, res) => {
    res.render('home', { title: 'Каталог', userId: req.ctx.userId, page: 'home' });
});

app.get('/login', (_req, res) => res.render('login', { title: 'Вход', page: 'login' }));
app.get('/register', (_req, res) => res.render('register', { title: 'Регистрация', page: 'register' }));
app.get('/forgot', (_req, res) => res.render('forgot', { title: 'Восстановление пароля', page: 'forgot' }));
app.get('/reset', (_req, res) => res.render('reset', { title: 'Сброс пароля', page: 'reset' }));

app.get('/product/:id', (req, res) => {
    res.render('product', { title: 'Товар', id: req.params.id, userId: req.ctx.userId, page: 'product' });
});

app.get('/me/history', (req, res) => {
    if (!req.ctx.userId) return res.redirect('/login');
    res.render('history', { userId: req.ctx.userId, email: req.ctx.email, page: 'history' });
});

app.get('/me/reco', (req, res) => {
    if (!req.ctx.userId) return res.redirect('/login');
    res.render('reco', { userId: req.ctx.userId, email: req.ctx.email, page: 'reco' });
});

app.get('/admin', (req, res) => {
    res.render('admin', { userId: req.ctx.userId, page: 'admin' });
});

// auth «фиксация» сессии после успешного /auth/login
app.post('/_session/set', (req, res) => {
    const { userId, email } = req.body || {};
    req.session.userId = userId || null;
    req.session.email = email || null;
    res.json({ ok: true });
});

// generic error handler for API routes
app.use((err, _req, res, _next) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ ok: false, error: 'Internal error' });
});

// boot
const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI;

(async () => {
    await connectDB(URI);
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
})();
