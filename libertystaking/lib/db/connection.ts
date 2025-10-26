import mysql from 'mysql2/promise';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔷 Database Module Loaded');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('DB_HOST:', process.env.DB_HOST || '❌ MISSING');
console.log('DB_USER:', process.env.DB_USER || '❌ MISSING');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ SET (length: ' + process.env.DB_PASSWORD.length + ')' : '❌ MISSING');
console.log('DB_NAME:', process.env.DB_NAME || '❌ MISSING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const dbConfig = {
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    console.log('🔵 Creating MySQL connection pool...');
    pool = mysql.createPool(dbConfig);
    console.log('✅ MySQL connection pool created\n');
  }
  return pool;
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  return await getPool().getConnection();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ MySQL connection pool closed');
  }
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const pool = getPool();
  const [results] = await pool.execute(sql, params);
  return results as any[];
}