# TikTok Shop OpenAPI Specification Issues Report

## Summary
Major discrepancies found between the OpenAPI specification and SDK implementation, primarily related to incorrect HTTP methods.

## Critical Issues Identified

### 1. HTTP Method Mismatches
The OpenAPI specification defines many endpoints as GET methods when they should be POST methods, as evidenced by:
- Operation IDs ending with "Post" (e.g., `OrdersSearchPost`, `GlobalCategoriesRecommendPost`)
- Presence of `requestBody` in GET endpoints (which is invalid)
- SDK implementation correctly uses POST methods

### 2. Specific Endpoint Issues Found

#### Affiliate APIs
- `/affiliate_creator/202405/open_collaborations/products/search`
  - **OpenAPI**: GET method with requestBody
  - **SDK**: POST method (`MarketplaceCreatorsSearchPost`)
  - **Issue**: GET methods cannot have request bodies

#### Order APIs
- `/order/202309/orders/search`
  - **OpenAPI**: GET method with requestBody
  - **SDK**: POST method (`OrdersSearchPost`)
  - **Issue**: Search operations with complex filters should use POST

#### Product APIs
- `/product/202309/global_categories/recommend`
  - **OpenAPI**: GET method with requestBody
  - **SDK**: POST method (`GlobalCategoriesRecommendPost`)
  - **Issue**: Recommendation endpoints typically use POST for complex input

- `/product/202309/products/{product_id}/partial_edit`
  - **OpenAPI**: GET method with requestBody
  - **SDK**: POST method (`ProductsProductIdPartialEditPost`)
  - **Issue**: Edit operations should always use POST/PUT/PATCH

- `/product/202309/products/{product_id}/inventory/update`
  - **OpenAPI**: GET method with requestBody
  - **SDK**: POST method (`ProductsProductIdInventoryUpdatePost`)
  - **Issue**: Update operations should use POST/PUT/PATCH

### 3. Pattern Analysis
- **Root Cause**: OpenAPI generator or specification creation process incorrectly defaulted all endpoints to GET
- **Evidence**: Operation IDs correctly indicate POST methods, but HTTP method field is wrong
- **Impact**: API documentation is misleading, Swagger UI shows incorrect usage examples

### 4. Additional Issues
- **Description Field Pollution**: Many endpoints have TypeScript SDK code in their description fields instead of proper API documentation
- **Inconsistent Summaries**: Most endpoints have generic "GetBrands" summary regardless of actual functionality

## Recommended Fixes

1. **Immediate**: Correct HTTP methods for all endpoints with "Post" in operationId
2. **Clean up**: Remove TypeScript code from description fields
3. **Improve**: Add proper summaries and descriptions for each endpoint
4. **Validate**: Ensure requestBody is only present in POST/PUT/PATCH methods

## Impact Assessment
- **High**: Developers using OpenAPI spec directly will implement incorrect HTTP methods
- **Medium**: API testing tools and documentation generators show wrong information
- **Low**: SDK users are unaffected as SDK implementation is correct