#!/usr/bin/env node

/**
 * Startup initialization script for deployments
 * 
 * This script should be run after the server starts to ensure:
 * 1. Valid authentication token
 * 2. Optional cache warmup
 * 
 * Usage:
 * - node scripts/startup-init.js
 * - node scripts/startup-init.js --warmup
 * - node scripts/startup-init.js --warmup --comprehensive
 * - node scripts/startup-init.js --port 3001
 */

const http = require('http');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const warmup = args.includes('--warmup');
const comprehensive = args.includes('--comprehensive');
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : process.env.PORT || '3000';
const host = process.env.HOST || 'localhost';
const protocol = process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true' ? 'https' : 'http';

console.log('🚀 Starting server initialization...');
console.log(`- Server: ${protocol}://${host}:${port}`);
console.log(`- Warmup cache: ${warmup}`);
console.log(`- Comprehensive: ${comprehensive}`);

// Build URL with query parameters
const queryParams = new URLSearchParams();
if (warmup) queryParams.set('warmup', 'true');
if (comprehensive) queryParams.set('comprehensive', 'true');

const url = `${protocol}://${host}:${port}/api/server/initialize?${queryParams.toString()}`;

console.log(`📡 Calling: ${url}`);

// Make HTTP request
const requestModule = protocol === 'https' ? https : http;

const startTime = Date.now();

requestModule.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const duration = Date.now() - startTime;
    
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ Server initialization completed successfully');
        console.log(`⏱️  Duration: ${duration}ms`);
        
        if (result.recommendations) {
          console.log('\n📊 Results:');
          console.log(`- Token valid: ${result.recommendations.tokenValid}`);
          console.log(`- Token renewed: ${result.recommendations.tokenRenewed}`);
          console.log(`- Token expires: ${result.recommendations.expiresAt}`);
          console.log(`- Cache warmed: ${result.recommendations.cacheWarmed}`);
        }
        
        if (result.results?.errors?.length > 0) {
          console.log('\n⚠️  Warnings:');
          result.results.errors.forEach(error => console.log(`- ${error}`));
        }
        
        process.exit(0);
      } else {
        console.error('❌ Server initialization failed');
        console.error(`⏱️  Duration: ${duration}ms`);
        
        if (result.results?.errors?.length > 0) {
          console.error('\n🚨 Errors:');
          result.results.errors.forEach(error => console.error(`- ${error}`));
        }
        
        process.exit(1);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse server response');
      console.error('Response:', data);
      console.error('Parse error:', parseError.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
  console.error('\n💡 Possible solutions:');
  console.error('- Check if the server is running');
  console.error('- Verify the port and host configuration');
  console.error('- Ensure the server has started completely');
  console.error('- Check firewall and network settings');
  
  process.exit(1);
});

// Set timeout for the request
setTimeout(() => {
  console.error('❌ Request timeout (30 seconds)');
  console.error('The server might be taking too long to respond or is not running');
  process.exit(1);
}, 30000);