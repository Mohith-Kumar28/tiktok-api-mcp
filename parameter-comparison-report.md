# OpenAPI Parameter Comparison Report

## Executive Summary
This report analyzes parameter inconsistencies between the OpenAPI specification (`tiktok-shop-openapi.json`) and the TypeScript SDK methods. Multiple critical issues were identified including duplicate parameters, missing parameters, and conflicting requirements.

## Selected Endpoints for Analysis

### 1. `/affiliate_creator/202405/open_collaborations/products/search` (POST)
**OpenAPI Parameters:**
- `shop_cipher` (required)
- `app_key` (required)
- `sign` (required)
- `timestamp` (required)
- `page_size` (required)
- `x-tts-access-token` (required)
- `x-tts-access-token?` (optional) ⚠️ **DUPLICATE**
- `Content-Type` (required)
- `sort_field?` (optional)
- `sort_order?` (optional)

**SDK Method Parameters:**
- `pageSize` (required)
- `xTtsAccessToken` (required)
- `contentType` (required)
- `pageToken?` (optional) ⚠️ **MISSING IN OPENAPI**
- `sortField?` (optional)
- `sortOrder?` (optional)
- `CreatorSearchOpenCollaborationProductRequestBody?` (optional)

**Issues Found:**
1. **Duplicate Parameter**: `x-tts-access-token` appears twice (required and optional)
2. **Missing Parameter**: `page_token` exists in SDK but missing in OpenAPI
3. **Missing Auth Parameters**: SDK doesn't include `shop_cipher`, `app_key`, `sign`, `timestamp`

### 2. `/affiliate_creator/202405/orders/search` (POST)
**OpenAPI Parameters:**
- `shop_cipher` (required)
- `app_key` (required)
- `sign` (required)
- `timestamp` (required)
- `page_size` (required)
- `x-tts-access-token` (required)
- `Content-Type` (required)

**SDK Method Parameters:**
- `pageSize` (required)
- `xTtsAccessToken` (required)
- `contentType` (required)
- `version?` (optional) ⚠️ **MISSING IN OPENAPI**
- `pageToken?` (optional) ⚠️ **MISSING IN OPENAPI**

**Issues Found:**
1. **Missing Parameters**: `version` and `page_token` exist in SDK but missing in OpenAPI
2. **Missing Auth Parameters**: SDK doesn't include authentication parameters

### 3. `/affiliate_creator/202405/showcases/products/add` (POST)
**OpenAPI Parameters:**
- `shop_cipher` (required)
- `app_key` (required)
- `sign` (required)
- `timestamp` (required)
- `x-tts-access-token` (required)
- `Content-Type` (required)

**SDK Method Parameters:**
- `xTtsAccessToken` (required)
- `contentType` (required)
- `AddShowcaseProductsRequestBody?` (optional)

**Issues Found:**
1. **Missing Auth Parameters**: SDK doesn't include authentication parameters

### 4. `/affiliate_partner/202405/campaigns/{campaign_id}` (GET)
**OpenAPI Parameters:**
- `shop_cipher` (required)
- `app_key` (required)
- `sign` (required)
- `timestamp` (required)
- `campaign_id` (required, path parameter)
- `category_asset_cipher` (required)
- `x-tts-access-token` (required)
- `Content-Type` (required)

**SDK Method Parameters:**
- `campaignId` (required, path parameter)
- `categoryAssetCipher` (required)
- `xTtsAccessToken` (required)
- `contentType` (required)

**Issues Found:**
1. **Missing Auth Parameters**: SDK doesn't include authentication parameters

### 5. `/logistics/202309/warehouses` (GET)
**OpenAPI Parameters:**
- `shop_cipher` (required)
- `shop_cipher?` (optional) ⚠️ **DUPLICATE WITH CONFLICTING REQUIREMENTS**
- `app_key` (required)
- `sign` (required)
- `timestamp` (required)
- `x-tts-access-token` (required)
- `Content-Type` (required)

**Issues Found:**
1. **Critical Conflict**: `shop_cipher` appears both as required and optional parameter

## Critical Issues Summary

### 1. Duplicate Parameters
- `x-tts-access-token` appears multiple times with different requirements
- `shop_cipher` appears both as required and optional in some endpoints

### 2. Missing Parameters in OpenAPI
- `page_token`: Critical pagination parameter missing in multiple endpoints
- `version`: Version parameter missing in orders search endpoint

### 3. Authentication Parameter Inconsistency
- OpenAPI includes authentication parameters (`shop_cipher`, `app_key`, `sign`, `timestamp`)
- SDK methods don't include these parameters (likely handled by authentication layer)
- This creates a mismatch in parameter expectations

### 4. Parameter Naming Inconsistencies
- OpenAPI uses snake_case: `page_size`, `sort_field`
- SDK uses camelCase: `pageSize`, `sortField`

## Recommendations

1. **Fix Duplicate Parameters**: Remove duplicate parameter definitions
2. **Add Missing Parameters**: Include `page_token` and other missing parameters in OpenAPI spec
3. **Resolve shop_cipher Conflict**: Determine correct requirement level for `shop_cipher`
4. **Standardize Authentication**: Decide whether auth parameters should be in OpenAPI spec or handled separately
5. **Consistent Naming**: Align parameter naming convention between OpenAPI and SDK

## Root Cause Analysis

The parameter generation script (`generate-openapi.js`) appears to:
1. Add authentication parameters to all endpoints
2. Not properly handle existing parameters, causing duplicates
3. Miss some SDK-specific parameters like `page_token`
4. Create conflicting requirements for the same parameter

This suggests the script needs to:
- Better parse existing SDK parameters
- Avoid duplicate parameter generation
- Properly merge authentication and API-specific parameters
- Maintain consistent parameter requirements