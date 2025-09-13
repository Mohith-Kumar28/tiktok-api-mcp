const fs = require('fs');
const path = require('path');

// Helper function to convert TypeScript type to OpenAPI type
function convertTypeScriptToOpenAPIType(tsType) {
  if (tsType.includes('Array<')) {
    const innerType = tsType.match(/Array<(.+)>/)?.[1] || 'string';
    return {
      type: 'array',
      items: convertTypeScriptToOpenAPIType(innerType)
    };
  }
  
  switch (tsType) {
    case 'string': return { type: 'string' };
    case 'number': return { type: 'number' };
    case 'boolean': return { type: 'boolean' };
    case 'Date': return { type: 'string', format: 'date-time' };
    default:
      // If it's a custom type, reference it
      if (tsType && !['string', 'number', 'boolean'].includes(tsType)) {
        return { $ref: `#/components/schemas/${tsType}` };
      }
      return { type: 'string' };
  }
}

// Function to parse TypeScript model files
function parseModelFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const className = path.basename(filePath, '.ts');
  
  // Extract class properties and their types
  const properties = {};
  const required = [];
  
  // Find attributeTypeMap
  const attributeTypeMapMatch = content.match(/static attributeTypeMap[\s\S]*?\[([\s\S]*?)\]/m);
  if (attributeTypeMapMatch) {
    const mapContent = attributeTypeMapMatch[1];
    const propertyMatches = mapContent.matchAll(/\{[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"type":\s*"([^"]+)"[\s\S]*?\}/g);
    
    for (const match of propertyMatches) {
      const [, name, type] = match;
      properties[name] = convertTypeScriptToOpenAPIType(type);
      
      // Check if property is optional (has '?' in declaration)
      const propRegex = new RegExp(`'${name}'\\?\\s*:`);
      if (!propRegex.test(content)) {
        required.push(name);
      }
    }
  }
  
  // Extract description from comments
  const classMatch = content.match(/export class (\w+) \{/);
  let description = `${className} model`;
  
  return {
    [className]: {
      type: 'object',
      description,
      properties,
      ...(required.length > 0 && { required })
    }
  };
}

// Function to parse API files and extract endpoints
function parseApiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const paths = {};
  
  // Extract async method definitions with their full signatures
  const methodRegex = /public\s+async\s+(\w+)\s*\(([^)]+)\)\s*:\s*Promise<\{\s*response:\s*[^;]+;\s*body:\s*([^;\}]+);?\s*\}>/g;
  const methodMatches = content.matchAll(methodRegex);
  
  for (const match of methodMatches) {
    const [fullMatch, methodName, paramString, responseType] = match;
    
    // Find the localVarPath assignment for this method
    const methodBodyRegex = new RegExp(`public\\s+async\\s+${methodName}[\\s\\S]*?const\\s+localVarPath\\s*=\\s*this\\.basePath\\s*\\+\\s*['"]([^'"]+)['"]`, 'm');
    const pathMatch = content.match(methodBodyRegex);
    
    if (!pathMatch) continue;
    
    let url = pathMatch[1];
    // Remove basePath reference if present
    if (url.includes('this.basePath + ')) {
      url = url.replace('this.basePath + ', '').replace(/['"`]/g, '');
    }
    
    // Determine HTTP method from the method implementation
    const httpMethodRegex = new RegExp(`public\s+async\s+${methodName}[\\s\\S]*?method:\s*['"]([^'"]+)['"]`, 'm');
    const httpMethodMatch = content.match(httpMethodRegex);
    const httpMethod = httpMethodMatch ? httpMethodMatch[1].toLowerCase() : 'get';
    
    // Parse parameters
    const parameters = [];
    let requestBody = null;
    
    if (paramString) {
      const params = paramString.split(',').map(p => p.trim());
      
      for (const param of params) {
        const [nameWithOptional, type] = param.split(':').map(s => s.trim());
        if (!nameWithOptional || !type || nameWithOptional.includes('options')) continue;
        
        const isOptional = nameWithOptional.includes('?');
        const name = nameWithOptional.replace('?', '');
        
        if (type.includes('RequestBody')) {
          // This is a request body
          requestBody = {
            required: !isOptional,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${type}` }
              }
            }
          };
        } else if (name === 'pageSize' || name === 'pageToken' || name === 'shopCipher') {
          // Query parameters
          parameters.push({
            name: name === 'pageSize' ? 'page_size' : name === 'pageToken' ? 'page_token' : 'shop_cipher',
            in: 'query',
            required: !isOptional,
            schema: convertTypeScriptToOpenAPIType(type)
          });
        } else if (name === 'xTtsAccessToken') {
          // Header parameter
          parameters.push({
            name: 'x-tts-access-token',
            in: 'header',
            required: !isOptional,
            schema: { type: 'string' }
          });
        } else if (name === 'contentType') {
          // Content-Type header
          parameters.push({
            name: 'Content-Type',
            in: 'header',
            required: !isOptional,
            schema: { type: 'string', enum: ['application/json'] }
          });
        } else if (url.includes(`{${name}}`)) {
          // Path parameter
          parameters.push({
            name,
            in: 'path',
            required: true,
            schema: convertTypeScriptToOpenAPIType(type)
          });
        }
      }
    }
    
    // Extract summary from JSDoc comments
    const summaryRegex = new RegExp(`/\\*\\*[\\s\\S]*?@summary\\s+([^\\n\\r]+)[\\s\\S]*?\\*/\\s*public\\s+async\\s+${methodName}`, 'm');
    const summaryMatch = content.match(summaryRegex);
    const summary = summaryMatch ? summaryMatch[1].trim() : `${methodName} endpoint`;
    
    // Extract description from JSDoc comments
    const descRegex = new RegExp(`/\\*\\*\\s*([\\s\\S]*?)\\s*@summary`, 'm');
    const descMatch = content.match(descRegex);
    let description = `Auto-generated endpoint for ${methodName}`;
    if (descMatch) {
      description = descMatch[1].replace(/\*/g, '').trim();
    }
    
    const pathItem = {
      [httpMethod]: {
        summary,
        description,
        operationId: methodName,
        ...(parameters.length > 0 && { parameters }),
        ...(requestBody && { requestBody }),
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${responseType.trim()}` }
              }
            }
          },
          '400': {
            description: 'Bad request'
          },
          '401': {
            description: 'Unauthorized'
          },
          '500': {
            description: 'Internal server error'
          }
        },
        security: [{ 'BearerAuth': [] }]
      }
    };
    
    paths[url] = { ...paths[url], ...pathItem };
  }
  
  return paths;
}

// Main function to generate OpenAPI spec
function generateOpenAPISpec() {
  const schemas = {};
  const paths = {};
  
  console.log('Scanning model files...');
  
  // Scan all model files
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') && item !== 'models.ts') {
        try {
          const modelSchema = parseModelFile(fullPath);
          Object.assign(schemas, modelSchema);
        } catch (error) {
          console.warn(`Warning: Could not parse model file ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  // Scan model directory
  const modelDir = path.join(__dirname, 'nodejs-sdk', 'model');
  if (fs.existsSync(modelDir)) {
    scanDirectory(modelDir);
  }
  
  console.log(`Found ${Object.keys(schemas).length} schemas`);
  
  // Scan API files
  console.log('Scanning API files...');
  const apiDir = path.join(__dirname, 'nodejs-sdk', 'api');
  if (fs.existsSync(apiDir)) {
    const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'));
    
    for (const apiFile of apiFiles) {
      try {
        const apiPaths = parseApiFile(path.join(apiDir, apiFile));
        Object.assign(paths, apiPaths);
      } catch (error) {
        console.warn(`Warning: Could not parse API file ${apiFile}:`, error.message);
      }
    }
  }
  
  console.log(`Found ${Object.keys(paths).length} endpoints`);
  
  // Generate OpenAPI specification
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'TikTok Shop OpenAPI',
      description: 'SDK for TikTok Shop APIs',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'https://open-api.tiktokglobalshop.com',
        description: 'TikTok Shop API Server'
      }
    ],
    paths,
    components: {
      schemas,
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  };
  
  // Write the specification to file
  const outputPath = path.join(__dirname, 'tiktok-shop-openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
  
  console.log(`\nGenerated OpenAPI specification with:`);
  console.log(`- ${Object.keys(schemas).length} schemas`);
  console.log(`- ${Object.keys(paths).length} endpoints`);
  console.log(`- Saved to: ${outputPath}`);
  
  return openApiSpec;
}

// Run the generator
if (require.main === module) {
  generateOpenAPISpec();
}

module.exports = { generateOpenAPISpec };