const fs = require('fs');
const path = require('path');

// Read the OpenAPI specification
const openApiPath = path.join(__dirname, 'tiktok-shop-openapi-fixed.json');
const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// Add missing schema definitions
const missingSchemas = {
  'AffiliateSeller202406SellerSearchCreatoronMarketplaceRequestBody': {
    type: 'object',
    properties: {
      follower_demographics: {
        type: 'object',
        properties: {
          age_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Age range filters for creator followers'
          },
          gender_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Gender distribution filters for creator followers'
          },
          location_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Geographic location filters for creator followers'
          }
        }
      },
      gmv_ranges: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filtering by GMV range intervals: GMV_RANGE_0_100, GMV_RANGE_100_1000, GMV_RANGE_1000_10000, GMV_RANGE_10000_AND_ABOVE'
      },
      keyword: {
        type: 'string',
        description: 'Searching creators by keyword, matching based on TikTok Username and Nickname'
      },
      search_key: {
        type: 'string',
        description: 'Caching search results improves api performance and ensures stable request results'
      },
      units_sold_ranges: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filtering by sales volume range intervals: UNITS_SOLD_RANGE_0_10, UNITS_SOLD_RANGE_10_100, UNITS_SOLD_RANGE_100_1000, UNITS_SOLD_RANGE_1000_AND_ABOVE'
      }
    }
  },
  'AffiliateSeller202406SellerSearchCreatoronMarketplaceResponse': {
    type: 'object',
    properties: {
      code: {
        type: 'integer',
        description: 'The success or failure status code returned in API response'
      },
      data: {
        type: 'object',
        properties: {
          creators: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                creator_user_id: { type: 'string', description: 'Creator TikTok User ID' },
                username: { type: 'string', description: 'Creator TikTok username' },
                nickname: { type: 'string', description: 'Creator display name' },
                follower_count: { type: 'integer', description: 'Number of followers' },
                gmv: { type: 'number', description: 'Gross merchandise value in last 30 days' },
                units_sold: { type: 'integer', description: 'Units sold in last 30 days' }
              }
            }
          },
          next_page_token: {
            type: 'string',
            description: 'Token for next page of results'
          },
          search_key: {
            type: 'string',
            description: 'Search key for caching results'
          }
        }
      },
      message: {
        type: 'string',
        description: 'The success or failure messages returned in API response'
      },
      request_id: {
        type: 'string',
        description: 'Request log identifier'
      }
    }
  },
  'AffiliateSeller202505SellerSearchCreatoronMarketplaceRequestBody': {
    type: 'object',
    properties: {
      follower_demographics: {
        type: 'object',
        properties: {
          age_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Age range filters for creator followers'
          },
          gender_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Gender distribution filters for creator followers'
          },
          location_ranges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Geographic location filters for creator followers'
          }
        }
      },
      gmv_ranges: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filtering by GMV range intervals: GMV_RANGE_0_100, GMV_RANGE_100_1000, GMV_RANGE_1000_10000, GMV_RANGE_10000_AND_ABOVE'
      },
      keyword: {
        type: 'string',
        description: 'Searching creators by keyword, matching based on TikTok Username and Nickname'
      },
      search_key: {
        type: 'string',
        description: 'Caching search results improves api performance and ensures stable request results'
      },
      units_sold_ranges: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filtering by sales volume range intervals: UNITS_SOLD_RANGE_0_10, UNITS_SOLD_RANGE_10_100, UNITS_SOLD_RANGE_100_1000, UNITS_SOLD_RANGE_1000_AND_ABOVE'
      }
    }
  },
  'AffiliateSeller202505SellerSearchCreatoronMarketplaceResponse': {
    type: 'object',
    properties: {
      code: {
        type: 'integer',
        description: 'The success or failure status code returned in API response'
      },
      data: {
        type: 'object',
        properties: {
          creators: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                creator_user_id: { type: 'string', description: 'Creator TikTok User ID' },
                username: { type: 'string', description: 'Creator TikTok username' },
                nickname: { type: 'string', description: 'Creator display name' },
                follower_count: { type: 'integer', description: 'Number of followers' },
                gmv: { type: 'number', description: 'Gross merchandise value in last 30 days' },
                units_sold: { type: 'integer', description: 'Units sold in last 30 days' }
              }
            }
          },
          next_page_token: {
            type: 'string',
            description: 'Token for next page of results'
          },
          search_key: {
            type: 'string',
            description: 'Search key for caching results'
          }
        }
      },
      message: {
        type: 'string',
        description: 'The success or failure messages returned in API response'
      },
      request_id: {
        type: 'string',
        description: 'Request log identifier'
      }
    }
  }
};

// Add missing schemas to components
if (!openApiSpec.components) {
  openApiSpec.components = {};
}
if (!openApiSpec.components.schemas) {
  openApiSpec.components.schemas = {};
}

// Add all missing schemas
Object.keys(missingSchemas).forEach(schemaName => {
  openApiSpec.components.schemas[schemaName] = missingSchemas[schemaName];
});

// Function to add authentication parameters to an endpoint
function addAuthParameters(endpoint) {
  if (!endpoint.parameters) {
    endpoint.parameters = [];
  }
  
  // Check if auth parameters already exist
  const existingParams = endpoint.parameters.map(p => p.name);
  
  const authParams = [
    {
      name: 'app_key',
      in: 'query',
      required: true,
      schema: { type: 'string' },
      description: 'Every single app will have a unique key. Please use the specific key assigned to your app'
    },
    {
      name: 'sign',
      in: 'query',
      required: true,
      schema: { type: 'string' },
      description: 'Signature generated by gen algorithm. When you send API requests to TTS, you must sign them so that TTS can identify the senders'
    },
    {
      name: 'timestamp',
      in: 'query',
      required: true,
      schema: { type: 'integer' },
      description: 'Unix timestamp GMT (UTC+00:00). This timestamp is used across all API requests. Developers can use this to convert to local time'
    }
  ];
  
  authParams.forEach(param => {
    if (!existingParams.includes(param.name)) {
      endpoint.parameters.push(param);
    }
  });
}

// Update specific endpoints with missing parameters and fix issues
const endpointsToFix = [
  '/affiliate_seller/202406/marketplace_creators/search',
  '/affiliate_seller/202505/marketplace_creators/search'
];

endpointsToFix.forEach(path => {
  if (openApiSpec.paths[path] && openApiSpec.paths[path].post) {
    const endpoint = openApiSpec.paths[path].post;
    
    // Add authentication parameters
    addAuthParameters(endpoint);
    
    // Make request body required
    if (endpoint.requestBody) {
      endpoint.requestBody.required = true;
    }
    
    // Update page_size parameter with enum and better description
    if (endpoint.parameters) {
      const pageSizeParam = endpoint.parameters.find(p => p.name === 'page_size');
      if (pageSizeParam) {
        pageSizeParam.schema = {
          type: 'integer',
          enum: [12, 20]
        };
        pageSizeParam.description = 'The value of "page_size" must be 12 or 20';
        pageSizeParam.required = true;
      }
    }
    
    // Update summary and description
    endpoint.summary = 'Search for Creators in the Creator Marketplace';
    endpoint.description = 'This API is used by Sellers to search for Creators in the Creator Marketplace. Sellers can search based on filters such as GMV, keywords, and Creator follower demographics. All the data returned is for the last 30 days.';
  }
});

// Add authentication parameters to ALL endpoints that don't have them
Object.keys(openApiSpec.paths).forEach(pathKey => {
  const pathItem = openApiSpec.paths[pathKey];
  Object.keys(pathItem).forEach(method => {
    if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
      const endpoint = pathItem[method];
      addAuthParameters(endpoint);
    }
  });
});

console.log('✅ Fixed OpenAPI specification:');
console.log('- Added missing schema definitions for AffiliateSeller202406 and AffiliateSeller202505');
console.log('- Added authentication parameters (app_key, sign, timestamp) to all endpoints');
console.log('- Fixed page_size parameter with enum [12, 20]');
console.log('- Made request bodies required where appropriate');
console.log('- Updated endpoint summaries and descriptions');

// Write the updated specification
fs.writeFileSync(openApiPath, JSON.stringify(openApiSpec, null, 2));
console.log('✅ OpenAPI specification updated successfully!');