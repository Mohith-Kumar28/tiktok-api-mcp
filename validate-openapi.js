const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const path = require('path');

async function validateOpenAPI() {
  try {
    console.log('🔍 Validating OpenAPI specification...');
    
    const filePath = path.join(__dirname, 'tiktok-shop-openapi-fixed.json');
    
    // Parse and validate the OpenAPI spec
    const api = await SwaggerParser.validate(filePath);
    
    console.log('✅ OpenAPI specification is valid!');
    console.log(`📋 API Title: ${api.info.title}`);
    console.log(`📋 API Version: ${api.info.version}`);
    console.log(`📋 Paths: ${Object.keys(api.paths).length}`);
    console.log(`📋 Components: ${Object.keys(api.components?.schemas || {}).length} schemas`);
    
    // Check for common issues
    const issues = [];
    
    // Check for circular references
    console.log('\n🔄 Checking for circular references...');
    
    // Check for missing schema references
    console.log('🔗 Checking schema references...');
    const allRefs = new Set();
    const availableSchemas = new Set(Object.keys(api.components?.schemas || {}));
    
    function findRefs(obj, path = '') {
      if (typeof obj === 'object' && obj !== null) {
        if (obj['$ref']) {
          const ref = obj['$ref'].replace('#/components/schemas/', '');
          allRefs.add(ref);
          if (!availableSchemas.has(ref)) {
            issues.push(`Missing schema reference: ${ref} at ${path}`);
          }
        }
        for (const [key, value] of Object.entries(obj)) {
          findRefs(value, `${path}.${key}`);
        }
      }
    }
    
    findRefs(api);
    
    console.log(`📊 Found ${allRefs.size} schema references`);
    console.log(`📊 Available schemas: ${availableSchemas.size}`);
    
    // Check for required properties in request bodies
    console.log('\n📝 Checking request body schemas...');
    let requestBodyCount = 0;
    let parameterCount = 0;
    
    for (const [pathKey, pathValue] of Object.entries(api.paths)) {
      for (const [method, operation] of Object.entries(pathValue)) {
        if (typeof operation === 'object' && operation.requestBody) {
          requestBodyCount++;
        }
        if (typeof operation === 'object' && operation.parameters) {
          parameterCount += operation.parameters.length;
        }
      }
    }
    
    console.log(`📊 Request bodies: ${requestBodyCount}`);
    console.log(`📊 Parameters: ${parameterCount}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No validation issues found!');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:');
    console.error(error.message);
    
    if (error.details) {
      console.error('\n📋 Error details:');
      error.details.forEach((detail, index) => {
        console.error(`${index + 1}. ${detail.message} at ${detail.path}`);
      });
    }
    
    process.exit(1);
  }
}

validateOpenAPI();