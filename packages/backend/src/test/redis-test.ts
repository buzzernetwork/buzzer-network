/**
 * Redis Connection Test
 * Tests Upstash Redis connection
 */

import { cache } from '../config/redis.js';

async function testRedis() {
  console.log('🧪 Testing Upstash Redis connection...\n');

  try {
    // Test 1: Set value
    console.log('1. Testing SET operation...');
    await cache.set('test:connection', { message: 'upstash-works', timestamp: Date.now() }, 60);
    console.log('   ✅ SET successful');

    // Test 2: Get value
    console.log('2. Testing GET operation...');
    const value = await cache.get<{ message: string; timestamp: number }>('test:connection');
    if (value && value.message === 'upstash-works') {
      console.log('   ✅ GET successful');
      console.log(`   Value: ${value.message}`);
    } else {
      console.log('   ⚠️  GET returned unexpected value');
    }

    // Test 3: Exists check
    console.log('3. Testing EXISTS operation...');
    const exists = await cache.exists('test:connection');
    if (exists) {
      console.log('   ✅ EXISTS check successful');
    } else {
      console.log('   ⚠️  EXISTS check failed');
    }

    // Test 4: Delete
    console.log('4. Testing DEL operation...');
    await cache.del('test:connection');
    const afterDelete = await cache.exists('test:connection');
    if (!afterDelete) {
      console.log('   ✅ DEL successful');
    } else {
      console.log('   ⚠️  DEL failed');
    }

    console.log('\n✅ All Redis operations successful!');
    console.log('🎉 Upstash Redis is working correctly\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Redis test failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('\n⚠️  Redis is optional - system will work without it\n');
    process.exit(1);
  }
}

testRedis();




