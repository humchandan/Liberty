import { getPool } from './connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Execute a SELECT query
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as T[];
}

/**
 * Execute a single row SELECT query
 */
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute INSERT query and return inserted ID
 */
export async function insert(
  sql: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result.insertId;
}

/**
 * Execute UPDATE query and return affected rows
 */
export async function update(
  sql: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result.affectedRows;
}

/**
 * Execute DELETE query and return affected rows
 */
export async function deleteQuery(
  sql: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result.affectedRows;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (connection: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
