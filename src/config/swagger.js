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
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            },
            schemas: {
                // ----- AUTH -----
                AuthRegister: {
                    type: 'object',
                    required: ['email', 'name', 'password'],
                    properties: {
                        id: { type: 'string', example: 'u_777' },
                        email: { type: 'string', example: 'new@ex.com' },
                        name: { type: 'string', example: 'New User' },
                        password: { type: 'string', example: 'Passw0rd!' },
                        segments: { type: 'array', items: { type: 'string' }, example: ['electronics'] }
                    }
                },
                AuthLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'alice@example.com' },
                        password: { type: 'string', example: 'Passw0rd!' }
                    }
                },
                AuthForgot: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string', example: 'alice@example.com' }
                    }
                },
                AuthReset: {
                    type: 'object',
                    required: ['email', 'code', 'newPassword'],
                    properties: {
                        email: { type: 'string', example: 'alice@example.com' },
                        code: { type: 'string', example: '123456' },
                        newPassword: { type: 'string', example: 'NewPass123!' }
                    }
                },

                // ----- PRODUCTS -----
                ProductCreate: {
                    type: 'object',
                    required: ['name', 'price'],
                    properties: {
                        id: { type: 'string', example: 'p_999' },
                        name: { type: 'string', example: 'Keychron K8' },
                        description: { type: 'string', example: 'Mechanical keyboard' },
                        categoryId: { type: 'string', example: 'c_10' },
                        categoryName: { type: 'string', example: 'Keyboards' },
                        price: { type: 'number', example: 89 },
                        brand: { type: 'string', example: 'Keychron' },
                        rating: { type: 'number', example: 4.6 },
                        attrs: { type: 'object', example: { layout: 'US', wireless: true } }
                    }
                },
                ProductUpdate: { $ref: '#/components/schemas/ProductCreate' },

                // ----- INTERACTIONS -----
                InteractionCreate: {
                    type: 'object',
                    required: ['userId', 'productId', 'type'],
                    properties: {
                        userId: { type: 'string', example: 'u_100' },
                        productId: { type: 'string', example: 'p_201' },
                        type: {
                            type: 'string',
                            enum: ['view', 'like', 'add_to_cart', 'purchase'],
                            example: 'view'
                        },
                        value: { type: 'number', example: 3 }
                    }
                },

                // ----- ORDERS -----
                Checkout: {
                    type: 'object',
                    required: ['userId', 'items'],
                    properties: {
                        userId: { type: 'string', example: 'u_100' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['productId', 'qty', 'price'],
                                properties: {
                                    productId: { type: 'string', example: 'p_201' },
                                    qty: { type: 'number', example: 1 },
                                    price: { type: 'number', example: 99 }
                                }
                            }
                        }
                    }
                },

                // ----- CART -----
                CartItemInput: {
                    type: 'object',
                    required: ['productId'],
                    properties: {
                        productId: { type: 'string', example: 'p_101' },
                        qty: {
                            type: 'integer',
                            minimum: 1,
                            example: 1,
                            description: 'Quantity to add (defaults to 1)',
                        },
                    },
                },
                CartSummary: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'cart_u_100' },
                        userId: { type: 'string', example: 'u_100' },
                        totalItems: { type: 'integer', example: 2 },
                        totalQty: { type: 'integer', example: 3 },
                        totalPrice: { type: 'number', example: 279.99 },
                        updatedAt: { type: 'string', format: 'date-time' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string', example: 'p_101' },
                                    qty: { type: 'integer', example: 2 },
                                    price: { type: 'number', example: 149.99 },
                                    product: {
                                        type: 'object',
                                        nullable: true,
                                        properties: {
                                            _id: { type: 'string' },
                                            name: { type: 'string' },
                                            brand: { type: 'string' },
                                            categoryName: { type: 'string' },
                                            price: { type: 'number' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }
        },
        // Enable globally if needed:
        // security: [{ bearerAuth: [] }],
    },
    apis: ['src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = { swaggerSpec };
