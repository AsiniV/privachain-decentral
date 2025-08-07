#!/usr/bin/env node

/**
 * Test SubQuery Integration
 * 
 * This script validates that the SubQuery project files are correctly configured
 * and the SearchBackend integration works as expected.
 */

import fs from 'fs';
import path from 'path';

// Test files exist
function testFilesExist() {
  const requiredFiles = [
    'project.ts',
    'project.yaml', 
    'schema.graphql',
    'src/index.ts',
    'src/mappings/mappingHandlers.ts',
    'src/types/index.ts',
    'src/types/CosmosMessageTypes.ts',
    'dist/index.js',
    'proto/osmosis/gamm/v1beta1/tx.proto',
    'proto/osmosis/poolmanager/v1beta1/swap_route.proto',
    'proto/cosmos/base/v1beta1/coin.proto'
  ];

  console.log('🔍 Testing SubQuery file structure...');
  
  let allExist = true;
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allExist = false;
  }

  return allExist;
}

// Test project manifest
function testProjectManifest() {
  console.log('\n🔍 Testing project manifest...');
  
  try {
    const projectContent = fs.readFileSync('project.ts', 'utf8');
    
    const requiredElements = [
      'CosmosDatasourceKind.Runtime',
      'CosmosHandlerKind.Message', 
      '/osmosis.gamm.v1beta1.MsgSwapExactAmountIn',
      'handleMessage',
      'osmosis-1',
      'startBlock: 11253914'
    ];

    let allFound = true;
    for (const element of requiredElements) {
      const found = projectContent.includes(element);
      console.log(`  ${found ? '✅' : '❌'} ${element}`);
      if (!found) allFound = false;
    }

    return allFound;
  } catch (error) {
    console.log(`  ❌ Error reading project.ts: ${error.message}`);
    return false;
  }
}

// Test GraphQL schema
function testGraphQLSchema() {
  console.log('\n🔍 Testing GraphQL schema...');
  
  try {
    const schemaContent = fs.readFileSync('schema.graphql', 'utf8');
    
    const requiredEntities = [
      'type Swap @entity',
      'type SwapRoute @entity', 
      'type Pool @entity',
      'id: ID!',
      'sender: String!',
      'txHash: String!',
      'blockHeight: BigInt!',
      '@derivedFrom(field: "swap")',
      '@derivedFrom(field: "pool")'
    ];

    let allFound = true;
    for (const entity of requiredEntities) {
      const found = schemaContent.includes(entity);
      console.log(`  ${found ? '✅' : '❌'} ${entity}`);
      if (!found) allFound = false;
    }

    return allFound;
  } catch (error) {
    console.log(`  ❌ Error reading schema.graphql: ${error.message}`);
    return false;
  }
}

// Test mapping handlers
function testMappingHandlers() {
  console.log('\n🔍 Testing mapping handlers...');
  
  try {
    const handlerContent = fs.readFileSync('src/mappings/mappingHandlers.ts', 'utf8');
    
    const requiredElements = [
      'import { MsgSwapExactAmountInMessage }',
      'import { Pool, Swap, SwapRoute }',
      'export async function handleMessage',
      'checkGetPool',
      'msg.msg.decodedMsg.sender',
      'msg.msg.decodedMsg.routes',
      'BigInt(msg.block.block.header.height)',
      'await swap.save()',
      'await swapRoute.save()'
    ];

    let allFound = true;
    for (const element of requiredElements) {
      const found = handlerContent.includes(element);
      console.log(`  ${found ? '✅' : '❌'} ${element}`);
      if (!found) allFound = false;
    }

    return allFound;
  } catch (error) {
    console.log(`  ❌ Error reading mapping handlers: ${error.message}`);
    return false;
  }
}

// Test SearchBackend integration
function testSearchBackendIntegration() {
  console.log('\n🔍 Testing SearchBackend integration...');
  
  try {
    const backendContent = fs.readFileSync('src/blockchain/SearchBackend.ts', 'utf8');
    
    const requiredElements = [
      'searchOsmosisSwaps',
      'getSwapStatistics', 
      'privachain-cosmos-indexer',
      'query SearchSwaps',
      'swaps(',
      'nodes {',
      'swapRoutes {',
      'result.swaps.nodes'
    ];

    let allFound = true;
    for (const element of requiredElements) {
      const found = backendContent.includes(element);
      console.log(`  ${found ? '✅' : '❌'} ${element}`);
      if (!found) allFound = false;
    }

    return allFound;
  } catch (error) {
    console.log(`  ❌ Error reading SearchBackend.ts: ${error.message}`);
    return false;
  }
}

// Test package.json has SubQuery dependencies
function testPackageJson() {
  console.log('\n🔍 Testing package.json dependencies...');
  
  try {
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const requiredDeps = [
      '@subql/cli',
      '@subql/common-cosmos',
      '@subql/node-cosmos', 
      '@subql/query',
      '@subql/types-cosmos'
    ];

    const requiredScripts = [
      'codegen',
      'subql:build'
    ];

    let allFound = true;
    
    console.log('  Dependencies:');
    for (const dep of requiredDeps) {
      const found = packageJson.dependencies && packageJson.dependencies[dep];
      console.log(`    ${found ? '✅' : '❌'} ${dep}`);
      if (!found) allFound = false;
    }

    console.log('  Scripts:');
    for (const script of requiredScripts) {
      const found = packageJson.scripts && packageJson.scripts[script];
      console.log(`    ${found ? '✅' : '❌'} ${script}`);
      if (!found) allFound = false;
    }

    return allFound;
  } catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

// Main test function
function main() {
  console.log('🚀 SubQuery Integration Test\n');

  const tests = [
    { name: 'File Structure', fn: testFilesExist },
    { name: 'Project Manifest', fn: testProjectManifest },
    { name: 'GraphQL Schema', fn: testGraphQLSchema },
    { name: 'Mapping Handlers', fn: testMappingHandlers },
    { name: 'SearchBackend Integration', fn: testSearchBackendIntegration },
    { name: 'Package Dependencies', fn: testPackageJson }
  ];

  let allPassed = true;
  const results = [];

  for (const test of tests) {
    const passed = test.fn();
    results.push({ name: test.name, passed });
    if (!passed) allPassed = false;
  }

  console.log('\n📊 Test Results:');
  for (const result of results) {
    console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}`);
  }

  console.log(`\n${allPassed ? '🎉' : '❌'} Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  if (allPassed) {
    console.log('\n✨ SubQuery integration is correctly configured!');
    console.log('📚 See SUBQUERY_README.md for usage instructions');
    console.log('🔄 Run "npm run codegen" to generate types');
    console.log('🏗️  Run "npm run subql:build" to compile the project');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration.');
  }

  return allPassed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main() ? 0 : 1);
}

export { main as testSubQueryIntegration };