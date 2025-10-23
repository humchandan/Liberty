import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  console.log('\n🧪 ━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST-DB ENDPOINT CALLED');
  console.log('🧪 ━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  console.log('📋 Configuration:');
  console.log('  Host:', config.host || '❌ MISSING');
  console.log('  User:', config.user || '❌ MISSING');
  console.log('  Password:', config.password ? '✅ SET' : '❌ MISSING');
  console.log('  Database:', config.database || '❌ MISSING');
  console.log('');

  if (!config.host || !config.user || !config.password || !config.database) {
    return NextResponse.json({
      success: false,
      error: 'Database configuration is incomplete',
      config: {
        host: config.host || 'MISSING',
        user: config.user || 'MISSING',
        password: config.password ? 'SET' : 'MISSING',
        database: config.database || 'MISSING',
      }
    }, { status: 500 });
  }

  try {
    console.log('📡 Step 1: Creating connection...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection created successfully!');
    
    console.log('📡 Step 2: Testing ping...');
    await connection.ping();
    console.log('✅ Ping successful!');
    
    console.log('📡 Step 3: Running test query...');
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as time, DATABASE() as db');
    console.log('✅ Query successful!');
    console.log('Result:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json({
      success: true,
      message: '✅ Database connection successful!',
      testQuery: rows,
      config: {
        host: config.host,
        user: config.user,
        database: config.database,
      }
    });
  } catch (error: any) {
    console.error('❌ ERROR OCCURRED:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    console.error('  SQL State:', error.sqlState);
    console.error('  Full Error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
      },
      config: {
        host: config.host,
        user: config.user,
        database: config.database,
      }
    }, { status: 500 });
  }
}
