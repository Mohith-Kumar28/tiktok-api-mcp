const fs = require('fs');

// Read the OpenAPI spec
const spec = JSON.parse(fs.readFileSync('tiktok-shop-openapi.json', 'utf8'));
const paths = Object.keys(spec.paths);

// Randomly select 15 endpoints
const randomPaths = paths.sort(() => 0.5 - Math.random()).slice(0, 15);

console.log('=== PARAMETER ANALYSIS FOR 15 RANDOM ENDPOINTS ===\n');

let duplicateCount = 0;
let missingPageTokenCount = 0;
let shopCipherConflicts = 0;

randomPaths.forEach((path, i) => {
  const methods = Object.keys(spec.paths[path]);
  
  methods.forEach(method => {
    const operation = spec.paths[path][method];
    const params = operation.parameters || [];
    
    console.log(`${i+1}. ${method.toUpperCase()} ${path}`);
    console.log(`   Operation ID: ${operation.operationId}`);
    console.log(`   Total Parameters: ${params.length}`);
    
    // Check for duplicates
    const paramNames = params.map(p => p.name);
    const uniqueNames = [...new Set(paramNames)];
    if (paramNames.length !== uniqueNames.length) {
      duplicateCount++;
      console.log(`   ⚠️  DUPLICATE PARAMETERS FOUND!`);
      const duplicates = paramNames.filter((name, index) => paramNames.indexOf(name) !== index);
      console.log(`   Duplicates: ${duplicates.join(', ')}`);
    }
    
    // Check for page_token
    const hasPageToken = params.some(p => p.name === 'page_token' || p.name === 'pageToken');
    if (!hasPageToken && (path.includes('list') || path.includes('search') || operation.operationId.toLowerCase().includes('list'))) {
      missingPageTokenCount++;
      console.log(`   ⚠️  MISSING PAGE TOKEN for list/search endpoint`);
    }
    
    // Check for shop_cipher conflicts
    const shopCipherParams = params.filter(p => p.name === 'shop_cipher');
    if (shopCipherParams.length > 1) {
      shopCipherConflicts++;
      console.log(`   ⚠️  SHOP_CIPHER CONFLICT: ${shopCipherParams.length} instances`);
      shopCipherParams.forEach((param, idx) => {
        console.log(`     ${idx+1}. ${param.required ? 'required' : 'optional'} in ${param.in}`);
      });
    }
    
    // List all parameters
    if (params.length > 0) {
      console.log('   Parameters:');
      params.forEach(p => {
        console.log(`     - ${p.name} (${p.in}) ${p.required ? 'required' : 'optional'}`);
      });
    }
    
    console.log('');
  });
});

console.log('=== SUMMARY ===');
console.log(`Total endpoints analyzed: ${randomPaths.length}`);
console.log(`Endpoints with duplicate parameters: ${duplicateCount}`);
console.log(`List/search endpoints missing page_token: ${missingPageTokenCount}`);
console.log(`Endpoints with shop_cipher conflicts: ${shopCipherConflicts}`);

if (duplicateCount === 0 && missingPageTokenCount === 0 && shopCipherConflicts === 0) {
  console.log('\n✅ All parameter issues have been resolved!');
} else {
  console.log('\n❌ Some issues still exist and need to be fixed.');
}