const fs = require('fs');
const path = require('path');

// Base OpenAPI specification structure
const openApiSpec = {
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
    schemas: {},
    parameters: {
      PageSize: {
        name: 'page_size',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      PageToken: {
        name: 'page_token',
        in: 'query',
        description: 'Token for pagination',
        schema: {
          type: 'string'
        }
      }
    }
  },
  paths: {}
};

// Helper function to convert TypeScript types to OpenAPI types
function convertTypeScriptType(tsType) {
  if (tsType.startsWith('Array<')) {
    const innerType = tsType.slice(6, -1);
    return {
      type: 'array',
      items: convertTypeScriptType(innerType)
    };
  }
  
  switch (tsType) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'Date':
      return { type: 'string', format: 'date-time' };
    default:
      // If it's a custom type, reference it
      if (tsType.includes('202')) {
        return { $ref: `#/components/schemas/${tsType}` };
      }
      return { type: 'object' };
  }
}

// Function to parse TypeScript model files
function parseModelFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const className = path.basename(filePath, '.ts');
  
  // Extract class name from export statement
  const classMatch = content.match(/export class (\w+)/);  
  if (!classMatch) return null;
  
  const actualClassName = classMatch[1];
  
  // Extract properties and their types from attributeTypeMap
  const attributeMapMatch = content.match(/static attributeTypeMap[\s\S]*?\[([\s\S]*?)\]/);  
  if (!attributeMapMatch) return null;
  
  const properties = {};
  const required = [];
  
  // Parse attribute type map
  const attributeMapContent = attributeMapMatch[1];
  const attributeMatches = attributeMapContent.match(/\{[^}]+\}/g) || [];
  
  attributeMatches.forEach(attr => {
    const nameMatch = attr.match(/"name":\s*"([^"]+)"/);
    const typeMatch = attr.match(/"type":\s*"([^"]+)"/);
    const baseNameMatch = attr.match(/"baseName":\s*"([^"]+)"/);
    
    if (nameMatch && typeMatch) {
      const propName = nameMatch[1];
      const propType = typeMatch[1];
      const baseName = baseNameMatch ? baseNameMatch[1] : propName;
      
      properties[baseName] = convertTypeScriptType(propType);
      
      // Extract description from JSDoc comments
      const propRegex = new RegExp(`'${propName}'\?:\s*[^;]+;`, 'g');
      const propMatch = content.match(propRegex);
      if (propMatch) {
        const beforeProp = content.substring(0, content.indexOf(propMatch[0]));
        const commentMatch = beforeProp.match(/\/\*\*([\s\S]*?)\*\//g);
        if (commentMatch && commentMatch.length > 0) {
          const lastComment = commentMatch[commentMatch.length - 1];
          const description = lastComment
            .replace(/\/\*\*|\*\//g, '')
            .replace(/\s*\*\s*/g, ' ')
            .trim();
          if (description && description !== propName) {
            properties[baseName].description = description;
          }
        }
      }
      
      // Check if property is required (not optional)
      const optionalMatch = content.match(new RegExp(`'${propName}'\?:`));
      if (!optionalMatch) {
        required.push(baseName);
      }
    }
  });
  
  const schema = {
    type: 'object',
    properties
  };
  
  if (required.length > 0) {
    schema.required = required;
  }
  
  // Add description from class JSDoc
  const classCommentMatch = content.match(/\/\*\*([\s\S]*?)\*\/[\s\S]*?export class/);
  if (classCommentMatch) {
    const description = classCommentMatch[1]
      .replace(/\s*\*\s*/g, ' ')
      .replace(/NOTE:.*$/m, '')
      .trim();
    if (description && !description.includes('auto generated')) {
      schema.description = description;
    }
  }
  
  return { name: actualClassName, schema };
}

// Function to parse API files
function parseApiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const paths = {};
  
  // Extract class name and methods
  const classMatch = content.match(/export class (\w+)/);
  if (!classMatch) return paths;

  const className = classMatch[1];
  
  // Find all public async methods
  const methodMatches = content.match(/public\s+async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<[^>]+>/g) || [];

  methodMatches.forEach(methodSignature => {
    const methodNameMatch = methodSignature.match(/public\s+async\s+(\w+)/);
    if (!methodNameMatch) return;

    const methodName = methodNameMatch[1];
    
    // Find the method implementation - look for the entire method body
    const methodStartIndex = content.indexOf(methodSignature);
    const methodEndIndex = content.indexOf('\n    }', methodStartIndex + methodSignature.length);
    
    if (methodStartIndex === -1 || methodEndIndex === -1) return;
    
    const methodContent = content.substring(methodStartIndex, methodEndIndex);
    
    // Extract path from localVarPath assignment
    const pathMatch = methodContent.match(/localVarPath\s*=\s*this\.basePath\s*\+\s*['"]([^'"]+)['"]/);  
    if (!pathMatch) return;

    let apiPath = pathMatch[1];
    
    // Extract HTTP method from request options
    const httpMethodMatch = methodContent.match(/method:\s*['"]([^'"]+)['"]/);  
    if (!httpMethodMatch) return;

    const httpMethod = httpMethodMatch[1].toLowerCase();
    
    // Extract parameters from method signature
    const paramRegex = new RegExp(`public\s+async\s+${methodName}\s*\(([^)]*)\)`);
    const paramMatch = methodContent.match(paramRegex);
    
    const parameters = [];
    const requestBody = {};
    
    if (paramMatch && paramMatch[1]) {
      const params = paramMatch[1].split(',').map(p => p.trim());
      
      params.forEach(param => {
        const paramParts = param.split(':').map(p => p.trim());
        if (paramParts.length >= 2) {
          const paramName = paramParts[0];
          const paramType = paramParts[1].replace(/\?$/, '');
          
          // Skip options parameter
          if (paramName === 'options') return;
          
          if (paramName.includes('RequestBody') || paramName.includes('Body')) {
            // This is a request body
            requestBody.content = {
              'application/json': {
                schema: convertTypeScriptType(paramType)
              }
            };
            requestBody.description = 'Request body';
          } else {
            // This is a parameter
            const isOptional = param.includes('?');
            
            // Determine parameter location based on name and method
            let paramIn = 'query';
            if (paramName.includes('Token') || paramName === 'xTtsAccessToken' || paramName === 'contentType') {
              paramIn = 'header';
            }
            
            const parameter = {
              name: paramName === 'xTtsAccessToken' ? 'x-tts-access-token' : 
                    paramName === 'contentType' ? 'Content-Type' :
                    paramName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
              in: paramIn,
              required: !isOptional,
              schema: convertTypeScriptType(paramType)
            };
            
            // Add description for common parameters
            if (paramName === 'pageSize') {
              parameter.description = 'Number of items per page';
            } else if (paramName === 'pageToken') {
              parameter.description = 'Token for pagination';
            } else if (paramName === 'xTtsAccessToken') {
              parameter.description = 'Access token for authentication';
            } else if (paramName === 'contentType') {
              parameter.description = 'Content type of the request';
            }
            
            parameters.push(parameter);
          }
        }
      });
    }
    
    // Extract response type
    const responseTypeMatch = methodSignature.match(/Promise<([^>]+)>/);
    let responseSchema = { type: 'object' };
    
    if (responseTypeMatch) {
      const responseType = responseTypeMatch[1];
      responseSchema = convertTypeScriptType(responseType);
    }
    
    // Extract JSDoc description - look before the method signature
    const beforeMethodIndex = content.lastIndexOf('/**', methodStartIndex);
    let description = `${methodName} operation`;
    let summary = methodName;
    
    if (beforeMethodIndex !== -1) {
      const commentEndIndex = content.indexOf('*/', beforeMethodIndex);
      if (commentEndIndex !== -1 && commentEndIndex < methodStartIndex) {
        const comment = content.substring(beforeMethodIndex, commentEndIndex + 2);
        
        // Extract description (first line after /**)
        const descMatch = comment.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
        
        // Extract @summary if available
        const summaryMatch = comment.match(/@summary\s+(.+?)\n/);
        if (summaryMatch && summaryMatch[1]) {
          summary = summaryMatch[1].trim();
        } else {
          summary = description;
        }
      }
    }
    
    // Build operation object
    const operation = {
      summary: summary,
      description: description,
      operationId: `${className}_${methodName}`,
      tags: [className.replace(/V\d+Api$/, '').replace(/Api$/, '')],
      security: [{ AccessToken: [] }],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: responseSchema
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
    
    if (parameters.length > 0) {
      operation.parameters = parameters;
    }
    
    if (Object.keys(requestBody).length > 0) {
      operation.requestBody = requestBody;
    }
    
    // Initialize path if not exists
    if (!paths[apiPath]) {
      paths[apiPath] = {};
    }
    
    paths[apiPath][httpMethod] = operation;
  });
  
  return paths;
}

// Main function to generate OpenAPI spec
function generateOpenApiSpec() {
  const sdkPath = path.join(__dirname, 'nodejs-sdk');
  const apiPath = path.join(sdkPath, 'api');
  const modelPath = path.join(sdkPath, 'model');
  
  console.log('Scanning API files...');
  
  // Process all API files
  function processApiFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processApiFiles(filePath);
      } else if (file.endsWith('Api.ts')) {
        console.log(`Processing API file: ${file}`);
        const apiPaths = parseApiFile(filePath);
        Object.assign(openApiSpec.paths, apiPaths);
      }
    });
  }
  
  // Process all model files
  function processModelFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processModelFiles(filePath);
      } else if (file.endsWith('.ts') && file !== 'models.ts') {
        console.log(`Processing model file: ${file}`);
        const modelData = parseModelFile(filePath);
        if (modelData) {
          openApiSpec.components.schemas[modelData.name] = modelData.schema;
        }
      }
    });
  }
  
  processApiFiles(apiPath);
  console.log('\nScanning model files...');
  processModelFiles(modelPath);
  
  console.log(`\nGenerated OpenAPI spec with:`);
  console.log(`- ${Object.keys(openApiSpec.paths).length} API paths`);
  console.log(`- ${Object.keys(openApiSpec.components.schemas).length} schemas`);
  
  // Write the OpenAPI specification to file
  const outputPath = path.join(__dirname, 'tiktok-shop-openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
  
  console.log(`\nOpenAPI specification saved to: ${outputPath}`);
  return openApiSpec;
}

// Run the generator
if (require.main === module) {
  generateOpenApiSpec();
}

module.exports = { generateOpenApiSpec };