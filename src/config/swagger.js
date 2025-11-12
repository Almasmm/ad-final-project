const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AD Final Project API',
            version: '1.0.0',
            description: 'E-commerce + NoSQL + CF recommendations',
        },
        servers: [{ url: 'http://localhost:3000' }],
    },
    apis: ['src/routes/*.js'], // будем описывать эндпоинты в JSDoc над роутами
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };