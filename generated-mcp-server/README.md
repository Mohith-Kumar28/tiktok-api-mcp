# TikTok Shop MCP Server

This is an MCP (Model Context Protocol) server generated from the TikTok Shop OpenAPI specification. It provides automatic signature generation for TikTok Shop API authentication.

## Features

- **Automatic Signature Generation**: Integrates with TikTok Shop API authentication using the `generate-sign.ts` module
- **Complete API Coverage**: Generated from the official TikTok Shop OpenAPI specification
- **MCP Protocol**: Compatible with MCP clients for seamless integration

## Setup

1. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Configure your TikTok Shop API credentials in `.env`:
   ```
   TIKTOK_APP_KEY=your_app_key_here
   TIKTOK_APP_SECRET=your_app_secret_here
   ACCESS_TOKEN=your_access_token_here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the server:
   ```bash
   npm run build
   ```

5. Run the server:
   ```bash
   npm start
   ```

## Usage

The server runs on stdio and communicates using the MCP protocol. It automatically handles:

- **Authentication**: Automatically generates required signatures for TikTok Shop API calls
- **Request Signing**: Uses the integrated `generate-sign.ts` module to sign requests with timestamps
- **API Proxying**: Forwards requests to the TikTok Shop API with proper authentication

## Available Tools

The server provides access to all TikTok Shop API endpoints as defined in the OpenAPI specification, including:

- Affiliate Creator APIs
- Product Management
- Order Management
- And many more...

## Development

- `npm run build`: Compile TypeScript to JavaScript
- `npm run typecheck`: Type check without emitting files
- `npm start`: Run the compiled server

## Authentication Flow

The server automatically:
1. Reads your `TIKTOK_APP_KEY` and `TIKTOK_APP_SECRET` from environment variables
2. Adds timestamps to requests when missing
3. Generates HMAC-SHA256 signatures using the `generateSign` function
4. Includes the signature in API requests to TikTok Shop

No manual signature generation required!