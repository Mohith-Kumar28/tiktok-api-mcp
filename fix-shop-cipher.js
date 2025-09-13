#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File paths
const inputFile = path.join(__dirname, 'tiktok-shop-openapi-corrected.json');
const outputFile = path.join(__dirname, 'tiktok-shop-openapi-corrected.json');

console.log('Starting shop_cipher parameter fix...');

try {
    // Read the OpenAPI specification
    console.log('Reading OpenAPI specification...');
    const data = fs.readFileSync(inputFile, 'utf8');
    let spec = JSON.parse(data);
    
    let changesCount = 0;
    const updatedDescription = "Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get API Authorization Shop to get shop_cipher.";
    
    // Function to recursively find and fix shop_cipher parameters
    function fixShopCipherParameters(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return;
        }
        
        // Check if this is a parameters array
        if (Array.isArray(obj)) {
            obj.forEach(param => {
                if (param && param.name === 'shop_cipher') {
                    if (param.required === false) {
                        param.required = true;
                        param.description = updatedDescription;
                        changesCount++;
                        console.log(`Fixed shop_cipher parameter (required: false -> true)`);
                    }
                }
            });
        }
        
        // Check if this is a parameter object with shop_cipher
        if (obj.name === 'shop_cipher' && obj.required === false) {
            obj.required = true;
            obj.description = updatedDescription;
            changesCount++;
            console.log(`Fixed shop_cipher parameter (required: false -> true)`);
        }
        
        // Recursively process all properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                fixShopCipherParameters(obj[key]);
            }
        }
    }
    
    // Process the entire specification
    console.log('Processing OpenAPI specification...');
    fixShopCipherParameters(spec);
    
    // Write the updated specification back to file
    console.log(`Making ${changesCount} changes to shop_cipher parameters...`);
    fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));
    
    console.log(`✅ Successfully updated ${changesCount} shop_cipher parameters`);
    console.log(`✅ Updated OpenAPI specification saved to: ${outputFile}`);
    console.log('\n🔄 Please restart the server to see the changes in Swagger UI');
    
} catch (error) {
    console.error('❌ Error processing OpenAPI specification:', error.message);
    process.exit(1);
}