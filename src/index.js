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

const app = express();

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

// boot
const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI;

(async () => {
    await connectDB(URI);
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
})();
