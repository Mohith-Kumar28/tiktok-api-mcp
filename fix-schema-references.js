const fs = require('fs');

// Read the OpenAPI file
let openApiContent = fs.readFileSync('tiktok-shop-openapi-fixed.json', 'utf8');

console.log('🔧 Fixing invalid schema references...');

// Fix invalid references to "object"
// Replace "$ref": "#/components/schemas/object" with proper object type
const invalidObjectRefs = /"\$ref":\s*"#\/components\/schemas\/object"/g;
const matches = openApiContent.match(invalidObjectRefs);

if (matches) {
  console.log(`Found ${matches.length} invalid 'object' references`);
  
  // Replace with proper object type definition
  openApiContent = openApiContent.replace(
    invalidObjectRefs,
    '"type": "object"'
  );
  
  console.log('✅ Fixed invalid object references');
}

// Fix other common invalid references
const commonFixes = [
  {
    pattern: /"\$ref":\s*"#\/components\/schemas\/string"/g,
    replacement: '"type": "string"',
    name: 'string'
  },
  {
    pattern: /"\$ref":\s*"#\/components\/schemas\/number"/g,
    replacement: '"type": "number"',
    name: 'number'
  },
  {
    pattern: /"\$ref":\s*"#\/components\/schemas\/boolean"/g,
    replacement: '"type": "boolean"',
    name: 'boolean'
  },
  {
    pattern: /"\$ref":\s*"#\/components\/schemas\/array"/g,
    replacement: '"type": "array", "items": {"type": "object"}',
    name: 'array'
  },
  {
    pattern: /"\$ref":\s*"#\/components\/schemas\/any"/g,
    replacement: '"type": "object", "additionalProperties": true',
    name: 'any'
  }
];

commonFixes.forEach(fix => {
  const matches = openApiContent.match(fix.pattern);
  if (matches) {
    console.log(`Found ${matches.length} invalid '${fix.name}' references`);
    openApiContent = openApiContent.replace(fix.pattern, fix.replacement);
    console.log(`✅ Fixed invalid ${fix.name} references`);
  }
});

// Write the fixed content
fs.writeFileSync('tiktok-shop-openapi-fixed.json', openApiContent);
console.log('✅ All invalid references fixed and saved!');

// Validate the fixed specification
const SwaggerParser = require('@apidevtools/swagger-parser');

console.log('\n🔍 Validating fixed OpenAPI specification...');
SwaggerParser.validate('tiktok-shop-openapi-fixed.json')
  .then(api => {
    console.log('✅ OpenAPI specification is now valid!');
    console.log(`API name: ${api.info.title}`);
    console.log(`API version: ${api.info.version}`);
    console.log(`Total paths: ${Object.keys(api.paths).length}`);
    console.log(`Total schemas: ${Object.keys(api.components.schemas).length}`);
  })
  .catch(err => {
    console.error('❌ Validation still failed:', err.message);
    // Show first few lines of error for debugging
    const errorLines = err.message.split('\n').slice(0, 3);
    console.error('Error details:', errorLines.join('\n'));
  });