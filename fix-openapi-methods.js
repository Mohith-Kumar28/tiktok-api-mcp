#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the OpenAPI specification
const openApiPath = path.join(__dirname, 'tiktok-shop-openapi-fixed.json');
const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

let fixedCount = 0;
let issuesFound = [];

console.log('🔍 Analyzing OpenAPI specification for HTTP method issues...');

// Iterate through all paths and methods
for (const [pathKey, pathObj] of Object.entries(openApiSpec.paths)) {
  for (const [method, operation] of Object.entries(pathObj)) {
    if (typeof operation !== 'object' || !operation.operationId) continue;
    
    const operationId = operation.operationId;
    const hasRequestBody = operation.requestBody !== undefined;
    
    // Check for endpoints that should be POST but are defined as GET
    if (method === 'get' && (operationId.endsWith('Post') || hasRequestBody)) {
      console.log(`❌ Found issue: ${pathKey} [${method.toUpperCase()}] - ${operationId}`);
      
      // Move the operation from GET to POST
      pathObj.post = operation;
      delete pathObj.get;
      
      // Clean up the description if it contains TypeScript code
      if (operation.description && operation.description.includes('import ')) {
        const lines = operation.description.split('\n');
        const cleanDescription = lines.find(line => 
          line.trim() && 
          !line.includes('import ') && 
          !line.includes('export ') &&
          !line.includes('class ') &&
          !line.includes('constructor') &&
          !line.includes('tiktok shop openapi')
        ) || 'API endpoint for TikTok Shop operations';
        
        operation.description = cleanDescription.trim();
      }
      
      // Fix generic summaries
      if (operation.summary === 'GetBrands' && !operationId.toLowerCase().includes('brand')) {
        // Generate a better summary based on operationId
        const summary = operationId
          .replace(/([A-Z])/g, ' $1')
          .replace(/Post$/, '')
          .trim();
        operation.summary = summary;
      }
      
      fixedCount++;
      issuesFound.push({
        path: pathKey,
        operationId: operationId,
        issue: 'GET method with POST operationId or requestBody',
        fixed: 'Changed to POST method'
      });
    }
    
    // Check for other potential issues
    if (method === 'get' && hasRequestBody) {
      console.log(`⚠️  Warning: ${pathKey} [GET] has requestBody but no Post operationId`);
      issuesFound.push({
        path: pathKey,
        operationId: operationId,
        issue: 'GET method with requestBody',
        fixed: 'Needs manual review'
      });
    }
  }
}

console.log(`\n✅ Fixed ${fixedCount} HTTP method issues`);

// Write the fixed specification
const outputPath = path.join(__dirname, 'tiktok-shop-openapi-corrected.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));

console.log(`📝 Corrected specification saved to: ${outputPath}`);

// Generate a detailed report
const reportPath = path.join(__dirname, 'fix-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalIssuesFixed: fixedCount,
  issues: issuesFound
}, null, 2));

console.log(`📊 Detailed report saved to: ${reportPath}`);

if (fixedCount > 0) {
  console.log('\n🎉 OpenAPI specification has been corrected!');
  console.log('Next steps:');
  console.log('1. Review the corrected specification');
  console.log('2. Replace the original file if satisfied');
  console.log('3. Restart the API documentation server');
} else {
  console.log('\n✨ No issues found - specification appears to be correct!');
}