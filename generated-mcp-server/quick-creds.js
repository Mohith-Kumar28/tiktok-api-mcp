#!/usr/bin/env node
// Quick TikTok Shop credential generator
// Usage: node quick-creds.js

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const timestamp = Math.floor(Date.now() / 1000);
const appKey = process.env.TIKTOK_APP_KEY;
const appSecret = process.env.TIKTOK_APP_SECRET;

if (!appKey || !appSecret) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure TIKTOK_APP_KEY and TIKTOK_APP_SECRET are set in .env file');
  process.exit(1);
}

// Generate signature for /authorization/202309/shops
const params = { app_key: appKey, timestamp: timestamp };
const excludeKeys = ['access_token', 'sign'];
const sortedParams = Object.keys(params)
  .filter((key) => !excludeKeys.includes(key))
  .sort()
  .map((key) => ({ key, value: params[key] }));

const paramString = sortedParams.map(({ key, value }) => `${key}${value}`).join('');
const signString = `${appSecret}/authorization/202309/shops${paramString}${appSecret}`;
const signature = crypto.createHmac('sha256', appSecret).update(signString).digest('hex');

console.log('🔑 Fresh TikTok Shop credentials:');
console.log(`app_key: ${appKey}`);
console.log(`timestamp: ${timestamp}`);
console.log(`sign: ${signature}`);
console.log('');
console.log('✅ Copy these values to use in your MCP calls!');


