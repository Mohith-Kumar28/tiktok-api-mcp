#!/usr/bin/env node

// Simple test script to verify the MCP server is working with the new tools
import { spawn } from 'child_process';

// Test the MCP server by sending JSON-RPC requests
function testMCPServer() {
  console.log('Testing MCP Server with restructured tools...');
  
  const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responseBuffer = '';
  
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    // Try to parse JSON responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('Server Response:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('Raw output:', line);
        }
      }
    });
  });
  
  server.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });
  
  // Test 1: List tools request
  setTimeout(() => {
    console.log('\n=== Testing List Tools ===');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 1000);
  
  // Test 2: Call list_apis tool
  setTimeout(() => {
    console.log('\n=== Testing list_apis Tool ===');
    const callListApisRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_apis',
        arguments: {
          filter: 'product'
        }
      }
    };
    server.stdin.write(JSON.stringify(callListApisRequest) + '\n');
  }, 2000);
  
  // Clean up after tests
  setTimeout(() => {
    console.log('\n=== Test Complete ===');
    server.kill();
    process.exit(0);
  }, 5000);
}

testMCPServer();