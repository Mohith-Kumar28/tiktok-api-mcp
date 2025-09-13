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

// Function to get TikTok Shop API common required parameters
function getTikTokShopCommonParameters() {
  return [
    {
      name: 'shop_cipher',
      in: 'query',
      required: true,
      schema: {
        type: 'string'
      },
      description: 'Encrypted shop identifier required for TikTok Shop API authentication. This parameter is mandatory for all API calls to identify and authenticate the shop making the request.'
    },
    {
      name: 'app_key',
      in: 'query',
      required: true,
      schema: {
        type: 'string'
      },
      description: 'Application key provided by TikTok Shop for API authentication'
    },
    {
      name: 'sign',
      in: 'query',
      required: true,
      schema: {
        type: 'string'
      },
      description: 'Request signature for API authentication and integrity verification'
    },
    {
      name: 'timestamp',
      in: 'query',
      required: true,
      schema: {
        type: 'integer',
        format: 'int64'
      },
      description: 'Unix timestamp when the request was made, used for API authentication'
    }
  ];
}

// Helper function to convert TypeScript types to OpenAPI types
function convertTypeScriptType(tsType) {
  // Handle complex Promise response types like { response: http.IncomingMessage; body: SomeType }
  if (tsType.includes('{ response:') && tsType.includes('body:')) {
    const bodyMatch = tsType.match(/body:\s*([^;\}]+)/);
    if (bodyMatch) {
      const bodyType = bodyMatch[1].trim();
      return convertTypeScriptType(bodyType);
    }
  }
  
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
      
      // Extract description from JSDoc comments - improved logic
      // Convert snake_case baseName to camelCase to match TypeScript property names
      const camelCaseName = baseName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      const propRegex = new RegExp(`'${camelCaseName}'\?:\\s*[^;]+;`);
      const propMatch = content.match(propRegex);
      
      if (propMatch) {
        const propIndex = content.indexOf(propMatch[0]);
        // Look for JSDoc comment immediately before the property
        const beforeProp = content.substring(0, propIndex);
        
        // Find the last JSDoc comment before this property
        const commentMatches = beforeProp.match(/\/\*\*([\s\S]*?)\*\//g);
        if (commentMatches && commentMatches.length > 0) {
          const lastComment = commentMatches[commentMatches.length - 1];
          
          // Clean up the comment text
          let description = lastComment
            .replace(/\/\*\*|\*\//g, '') // Remove /** and */
            .replace(/^\s*\*\s*/gm, '') // Remove leading * from each line
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .trim();
          
          // Only add description if it's meaningful and not just the property name
          if (description && description.length > 3 && description !== propName && !description.includes('auto generated')) {
            properties[baseName].description = description;
            console.log(`Added description for ${baseName}: ${description.substring(0, 50)}...`);
          }
        }
      } else {
        // Debug: Try to find the property in a different way
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`'${camelCaseName}'`)) {
            // Look for JSDoc comment above this line
            let commentLines = [];
            let j = i - 1;
            while (j >= 0 && (lines[j].trim().startsWith('*') || lines[j].trim() === '' || lines[j].includes('/**') || lines[j].includes('*/'))) {
              if (lines[j].includes('/**') || lines[j].includes('*/') || lines[j].trim().startsWith('*')) {
                commentLines.unshift(lines[j]);
              }
              if (lines[j].includes('/**')) break;
              j--;
            }
            
            if (commentLines.length > 0) {
              let description = commentLines.join('\n')
                .replace(/\/\*\*|\*\//g, '') // Remove /** and */
                .replace(/^\s*\*\s*/gm, '') // Remove leading * from each line
                .replace(/\n\s*\n/g, '\n') // Remove empty lines
                .trim();
              
              if (description && description.length > 3 && description !== propName && !description.includes('auto generated')) {
                properties[baseName].description = description;
                console.log(`Added description for ${baseName} (fallback): ${description.substring(0, 50)}...`);
              }
            }
            break;
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
  
  // Find all public async methods - handle multiline signatures
  const methodMatches = content.match(/public\s+async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<[\s\S]*?>/g) || [];

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
    
    // Extract path parameters from the URL template
    const pathParams = [];
    const pathParamMatches = apiPath.match(/\{([^}]+)\}/g);
    if (pathParamMatches) {
      pathParamMatches.forEach(match => {
        const paramName = match.slice(1, -1); // Remove { and }
        pathParams.push(paramName);
      });
    }
    
    // Extract parameters from method signature - handle multiline
    const paramRegex = new RegExp(`public\\s+async\\s+${methodName}\\s*\\(([\\s\\S]*?)\\)\\s*:\\s*Promise`, 'm');
    const paramMatch = methodSignature.match(paramRegex);
    
    const parameters = [];
    const requestBody = {};
    
    if (paramMatch && paramMatch[1]) {
      // Better parameter parsing to handle complex signatures
      const paramString = paramMatch[1].replace(/\s+/g, ' ').trim();
      
      // Split parameters more carefully, handling nested generics
      const params = [];
      let currentParam = '';
      let depth = 0;
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < paramString.length; i++) {
        const char = paramString[i];
        
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
        } else if (!inString) {
          if (char === '<' || char === '(' || char === '[' || char === '{') {
            depth++;
          } else if (char === '>' || char === ')' || char === ']' || char === '}') {
            depth--;
          } else if (char === ',' && depth === 0) {
            if (currentParam.trim()) {
              params.push(currentParam.trim());
            }
            currentParam = '';
            continue;
          }
        }
        
        currentParam += char;
      }
      
      if (currentParam.trim()) {
        params.push(currentParam.trim());
      }
      
      params.forEach(param => {
          const colonIndex = param.indexOf(':');
          if (colonIndex === -1) return;
          
          const paramName = param.substring(0, colonIndex).trim();
          const paramType = param.substring(colonIndex + 1).trim().replace(/\?$/, '');
          
          // Skip options parameter
          if (paramName === 'options') {
            return;
          }
            
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
            
            // Determine parameter location based on name and context
            let paramIn = 'query';
            let actualParamName = paramName;
            
            // Check if this is a path parameter
            const pathParamName = paramName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (pathParams.includes(pathParamName) || pathParams.includes(paramName)) {
              paramIn = 'path';
              actualParamName = pathParamName;
            } else if (paramName.includes('Token') || paramName === 'xTtsAccessToken') {
              paramIn = 'header';
              actualParamName = 'x-tts-access-token';
            } else if (paramName === 'contentType') {
              paramIn = 'header';
              actualParamName = 'Content-Type';
            } else {
              // For query parameters, convert camelCase to snake_case
              actualParamName = paramName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
              
              // Special handling for shopCipher to ensure it maps to shop_cipher consistently
              if (paramName === 'shopCipher' || actualParamName === 'shop_cipher') {
                actualParamName = 'shop_cipher';
              }
            }
            
            const parameter = {
              name: actualParamName,
              in: paramIn,
              required: paramIn === 'path' || !isOptional || paramName === 'xTtsAccessToken' || actualParamName === 'x-tts-access-token', // Path parameters and auth tokens are always required
              schema: convertTypeScriptType(paramType)
            };
            
            // Don't add optional suffix - we'll handle deduplication by base name
            
            // Add descriptions for common parameters
            if (paramName === 'pageSize') {
              parameter.description = 'Number of items per page';
            } else if (paramName === 'pageToken') {
              parameter.description = 'Token for pagination';
            } else if (paramName === 'xTtsAccessToken') {
              parameter.description = 'Access token for authentication';
            } else if (paramName === 'contentType') {
              parameter.description = 'Content type of the request';
            } else if (paramName === 'shopCipher') {
              parameter.description = 'Shop cipher for API authentication';
            } else if (paramName.includes('Id')) {
              parameter.description = `${paramName} identifier`;
            }
            
            parameters.push(parameter);
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
    
    // Determine if this endpoint needs shop authentication parameters
    const isAuthorizationEndpoint = apiPath.includes('/authorization/');
    const isSellerEndpoint = apiPath.includes('/seller/') && !apiPath.includes('/affiliate_seller/');
    
    // Get common parameters based on endpoint type
    const commonParameters = isAuthorizationEndpoint ? [] : getTikTokShopCommonParameters();
    
    // Create parameter map for deduplication
    const parameterMap = new Map();
    
    // Helper function to get base parameter name (remove optional suffixes)
    function getBaseParameterName(paramName) {
      return paramName.replace(/[?]$/, '');
    }
    
    // Add original API parameters first
    parameters.forEach(param => {
      const baseName = getBaseParameterName(param.name);
      const baseKey = `${baseName}_${param.in}`;
      // Clean the parameter name (remove optional suffix)
      param.name = baseName;
      parameterMap.set(baseKey, param);
    });
    
    // Add common parameters only for non-authorization endpoints (avoiding duplicates and updating existing ones)
    if (!isAuthorizationEndpoint) {
      commonParameters.forEach(commonParam => {
        const baseName = getBaseParameterName(commonParam.name);
        const baseKey = `${baseName}_${commonParam.in}`;
        if (parameterMap.has(baseKey)) {
          const existing = parameterMap.get(baseKey);
          // Update existing parameter to be required and add description if missing
          existing.required = true;
          if (!existing.description && commonParam.description) {
            existing.description = commonParam.description;
          }
          parameterMap.set(baseKey, existing);
        } else {
          parameterMap.set(baseKey, commonParam);
        }
      });
    }
    
    // Add pagination parameters for endpoints that need them
    // Check if endpoint has page_size or is a known paginated endpoint
    const hasPageSize = parameterMap.has('page_size_query');
    const isPaginatedEndpoint = apiPath.includes('/orders') || 
                               apiPath.includes('/products') || 
                               apiPath.includes('/sample_applications') ||
                               apiPath.includes('/marketplace_creators') ||
                               apiPath.includes('/search');
    
    if (hasPageSize || isPaginatedEndpoint) {
      // Always add page_token if page_size exists or it's a paginated endpoint
      const pageTokenParam = {
        name: 'page_token',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Token for pagination to get the next page of results'
      };
      
      const pageTokenKey = 'page_token_query';
      if (!parameterMap.has(pageTokenKey)) {
        parameterMap.set(pageTokenKey, pageTokenParam);
      }
      
      // Also ensure page_size is present for paginated endpoints
      const pageSizeParam = {
        name: 'page_size',
        in: 'query', 
        required: false,
        schema: { type: 'number' },
        description: 'Number of items to return per page (default: 10, max: 50)'
      };
      
      const pageSizeKey = 'page_size_query';
      if (!parameterMap.has(pageSizeKey)) {
        parameterMap.set(pageSizeKey, pageSizeParam);
      }
    }
    
    // Convert map back to array
    const allParameters = Array.from(parameterMap.values());
    
    if (allParameters.length > 0) {
      operation.parameters = allParameters;
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