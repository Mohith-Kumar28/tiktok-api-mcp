const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load the OpenAPI specification
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'tiktok-shop-openapi.json'), 'utf8')
);

// Swagger UI options
const options = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TikTok Shop API Documentation',
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true
  }
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

// Root endpoint
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TikTok Shop API Documentation Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 TikTok Shop API Documentation Server is running!`);
  console.log(`📖 Swagger UI available at: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
  console.log(`\n📋 API Documentation includes:`);
  console.log(`   • ${Object.keys(swaggerDocument.paths || {}).length} API endpoints`);
  console.log(`   • ${Object.keys(swaggerDocument.components?.schemas || {}).length} data schemas`);
  console.log(`   • Interactive API testing interface`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down TikTok Shop API Documentation Server...');
  process.exit(0);
});