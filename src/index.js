require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const healthRoutes = require('./routes/health');

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// routes
app.use('/', healthRoutes);

// boot
const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI;

(async () => {
    await connectDB(URI);
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
})();
