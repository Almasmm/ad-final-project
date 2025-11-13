require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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

const app = express();

// EJS + public
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// routes
app.use('/', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', recommendationRoutes); // /recommendations/:userId и /products/:id/similar
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/auth', authRoutes);

// простая сессия (для демо UI; JWT остаётся для API)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
}));

// вспомогательный middleware: положим userId из токена (если хранится в сессии)
app.use((req, _res, next) => {
    // в демо: после логина положим userId/email сюда
    req.ctx = { userId: req.session.userId || null, email: req.session.email || null };
    next();
});

// ======== PAGES (EJS) ========
app.get('/', (req, res) => {
    res.render('home', { userId: req.ctx.userId });
});

app.get('/login', (_req, res) => res.render('login'));
app.get('/register', (_req, res) => res.render('register'));
app.get('/forgot', (_req, res) => res.render('forgot'));
app.get('/reset', (_req, res) => res.render('reset'));

app.get('/product/:id', (req, res) => {
    res.render('product', { id: req.params.id, userId: req.ctx.userId });
});

app.get('/me/history', (req, res) => {
    if (!req.ctx.userId) return res.redirect('/login');
    res.render('history', { userId: req.ctx.userId });
});

app.get('/me/reco', (req, res) => {
    if (!req.ctx.userId) return res.redirect('/login');
    res.render('reco', { userId: req.ctx.userId });
});

app.get('/admin', (req, res) => {
    res.render('admin', { userId: req.ctx.userId });
});

// auth «фиксация» сессии после успешного /auth/login
app.post('/_session/set', (req, res) => {
    const { userId, email } = req.body || {};
    req.session.userId = userId || null;
    req.session.email = email || null;
    res.json({ ok: true });
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
