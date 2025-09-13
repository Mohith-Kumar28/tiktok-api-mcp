const fs = require('fs');
const path = require('path');

// Read all TypeScript API files
function readApiFiles() {
  const apiDir = path.join(__dirname, 'nodejs-sdk', 'api');
  const files = fs.readdirSync(apiDir).filter(file => file.endsWith('.ts'));
  
  const apis = {};
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(apiDir, file), 'utf8');
    const apiName = file.replace('.ts', '');
    apis[apiName] = content;
  });
  
  return apis;
}

// Read all model files
function readModelFiles() {
  const modelDir = path.join(__dirname, 'nodejs-sdk', 'model');
  const schemas = {};
  
  function readModelsRecursively(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readModelsRecursively(fullPath, prefix + item + '/');
      } else if (item.endsWith('.ts') && item !== 'models.ts') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const modelName = item.replace('.ts', '');
        const fullModelName = prefix + modelName;
        schemas[modelName] = parseTypeScriptModel(content, modelName);
      }
    });
  }
  
  readModelsRecursively(modelDir);
  return schemas;
}

// Parse TypeScript model to OpenAPI schema
function parseTypeScriptModel(content, modelName) {
  const schema = {
    type: 'object',
    properties: {},
    required: []
  };
  
  // Extract class definition and attributeTypeMap
  const classMatch = content.match(/export\s+class\s+(\w+)\s*\{([\s\S]*?)\}/s);
  if (!classMatch) return schema;
  
  // Extract property comments and definitions
  const propertyComments = {};
  const commentMatches = content.matchAll(/\/\*\*\s*\n\s*\*\s*([^\n]+)\s*\n\s*\*\/\s*'(\w+)'\??: /g);
  for (const match of commentMatches) {
    propertyComments[match[2]] = match[1].trim();
  }
  
  // Extract attributeTypeMap
  const typeMapMatch = content.match(/static attributeTypeMap[^\[]*\[([\s\S]*?)\];/s);
  if (typeMapMatch) {
    const typeMapContent = typeMapMatch[1];
    const attributeMatches = typeMapContent.matchAll(/\{\s*"name":\s*"(\w+)",\s*"baseName":\s*"([^"]+)",\s*"type":\s*"([^"]+)"\s*\}/g);
    
    for (const match of attributeMatches) {
      const [, propName, baseName, propType] = match;
      const property = parseTypeScriptType(propType.trim());
      
      // Add description from comments
      if (propertyComments[propName]) {
        property.description = propertyComments[propName];
      }
      
      schema.properties[propName] = property;
    }
  }
  
  // Extract required fields (properties without '?' in the class definition)
  const propertyMatches = content.matchAll(/'(\w+)'(\?)?:/g);
  for (const match of propertyMatches) {
    const [, propName, optional] = match;
    if (!optional && schema.properties[propName]) {
      schema.required.push(propName);
    }
  }
  
  return schema;
}

// Parse TypeScript type to OpenAPI type
function parseTypeScriptType(tsType) {
  // Remove trailing semicolon and whitespace
  tsType = tsType.replace(/;$/, '').trim();
  
  // Handle arrays
  if (tsType.includes('Array<') || tsType.endsWith('[]')) {
    const itemType = tsType.replace(/Array<(.+)>/, '$1').replace(/(.+)\[\]/, '$1');
    return {
      type: 'array',
      items: parseTypeScriptType(itemType)
    };
  }
  
  // Handle basic types
  switch (tsType) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'integer':
      return { type: 'integer' };
    case 'boolean':
      return { type: 'boolean' };
    case 'any':
      return {};
    case 'Date':
      return { type: 'string', format: 'date-time' };
    default:
      // Check if it's a reference to another model
      if (/^[A-Z]/.test(tsType) && !tsType.includes('<')) {
        return { $ref: `#/components/schemas/${tsType}` };
      }
      return { type: 'string' }; // fallback
  }
}

// Parse API method to extract parameters and request body
function parseApiMethod(methodContent, methodName) {
  const operation = {
    summary: methodName,
    operationId: methodName,
    parameters: [],
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'number' },
                message: { type: 'string' },
                request_id: { type: 'string' }
              }
            }
          }
        }
      },
      '401': {
        description: 'Unauthorized - Invalid or missing access token'
      },
      '500': {
        description: 'Internal Server Error'
      }
    }
  };
  
  // Extract method signature
  const methodMatch = methodContent.match(/public\s+async\s+(\w+)\s*\(([^)]+)\)\s*:\s*Promise<\{[^}]+body:\s*([^;]+);/);
  if (methodMatch) {
    const [, , params, responseType] = methodMatch;
    
    // Parse parameters
    const paramList = params.split(',').map(p => p.trim());
    paramList.forEach(param => {
      const paramMatch = param.match(/(\w+)(\?)?:\s*(.+)/);
      if (paramMatch) {
        const [, paramName, optional, paramType] = paramMatch;
        
        // Skip options parameter
        if (paramName === 'options') return;
        
        if (paramName.includes('RequestBody') || paramName.includes('Body')) {
          // This is a request body
          operation.requestBody = {
            required: !optional,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${paramType}` }
              }
            }
          };
        } else {
          // This is a parameter
          const parameter = {
            name: paramName === 'xTtsAccessToken' ? 'x-tts-access-token' : paramName,
            in: paramName === 'xTtsAccessToken' ? 'header' : 'query',
            required: !optional,
            schema: parseTypeScriptType(paramType)
          };
          
          if (paramName === 'contentType') {
            parameter.in = 'header';
            parameter.name = 'Content-Type';
          }
          
          operation.parameters.push(parameter);
        }
      }
    });
    
    // Set response schema
    if (responseType && responseType.trim() !== 'any') {
      operation.responses['200'].content['application/json'].schema = {
        $ref: `#/components/schemas/${responseType.trim()}`
      };
    }
  }
  
  return operation;
}

// Generate OpenAPI specification
function generateOpenAPISpec() {
  const apis = readApiFiles();
  const schemas = readModelFiles();
  
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'TikTok Shop API',
      description: 'Comprehensive API specification for TikTok Shop Partner Center',
      version: '1.0.0',
      contact: {
        name: 'TikTok Shop Partner Center',
        url: 'https://partner.tiktokshop.com'
      }
    },
    servers: [
      {
        url: 'https://open-api.tiktokglobalshop.com',
        description: 'TikTok Shop Global API Server'
      }
    ],
    security: [
      {
        AccessToken: []
      }
    ],
    components: {
      securitySchemes: {
        AccessToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-tts-access-token',
          description: 'Access token for TikTok Shop API authentication'
        }
      },
      schemas: schemas
    },
    paths: {}
  };
  
  // Process each API file
  Object.entries(apis).forEach(([apiName, content]) => {
    // Extract methods from API class
    const methodMatches = content.matchAll(/public\s+async\s+(\w+)\s*\([^)]+\)\s*:\s*Promise<[^>]+>[^{]*\{[^}]+localVarPath\s*=\s*[^'"]*['"]([^'"]+)['"][^}]+\}/gs);
    
    for (const match of methodMatches) {
      const [methodContent, methodName, path] = match;
      
      // Determine HTTP method from the method content
      let httpMethod = 'get';
      if (methodContent.includes("method: 'POST'")) httpMethod = 'post';
      else if (methodContent.includes("method: 'PUT'")) httpMethod = 'put';
      else if (methodContent.includes("method: 'DELETE'")) httpMethod = 'delete';
      
      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }
      
      const operation = parseApiMethod(methodContent, methodName);
      operation.tags = [apiName.replace('Api', '').replace(/V\d+/, '')];
      operation.security = [{ AccessToken: [] }];
      
      spec.paths[path][httpMethod] = operation;
    }
  });
  
  return spec;
}

// Main execution
console.log('Generating fixed OpenAPI specification...');
const spec = generateOpenAPISpec();

// Write the specification to file
fs.writeFileSync(
  path.join(__dirname, 'tiktok-shop-openapi-fixed.json'),
  JSON.stringify(spec, null, 2)
);

console.log('Fixed OpenAPI specification generated successfully!');
console.log(`- File: tiktok-shop-openapi-fixed.json`);
console.log(`- Schemas: ${Object.keys(spec.components.schemas).length}`);
console.log(`- Endpoints: ${Object.keys(spec.paths).length}`);