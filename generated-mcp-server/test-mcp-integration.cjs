#!/usr/bin/env node
/**
 * Test script to verify MCP server integration with TikTok Shop API
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Test the MCP server by sending a list tools request
function testMCPServer() {
  console.log('Testing MCP Server integration...');
  
  const mcpProcess = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responseData = '';
  
  mcpProcess.stdout.on('data', (data) => {
    responseData += data.toString();
    console.log('MCP Response:', data.toString());
  });
  
  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });
  
  mcpProcess.on('close', (code) => {
    console.log(`MCP process exited with code ${code}`);
  });
  
  // Send a list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  console.log('Sending list tools request...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Wait for response and then close
  setTimeout(() => {
    mcpProcess.kill();
    console.log('Test completed!');
  }, 5000);
}

if (require.main === module) {
  testMCPServer();
}

module.exports = { testMCPServer };