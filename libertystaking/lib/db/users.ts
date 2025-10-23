import { query, queryOne, insert, update } from './queries';

export interface User {
  user_id: number;
  wallet_address: string;
  custom_referral_code: string;
  referrer_wallet_address: string | null;
  referrer_code: string | null;
  full_name: string;
  email: string;
  mobile_number: string;
  address: string;
  zip_code: string;
  country: string | null;
  is_active: boolean;
  email_verified: boolean;
  mobile_verified: boolean;
  profile_completed: boolean;
  referrer_set_onchain: boolean;
  referrer_set_tx_hash: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

/**
 * Generate unique referral code
 */
export async function generateUniqueReferralCode(fullName: string): Promise<string> {
  const baseName = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const year = new Date().getFullYear();
  let code = `${baseName}-${year}`;
  let counter = 1;

  while (true) {
    const existing = await queryOne(
      'SELECT user_id FROM users WHERE custom_referral_code = ?',
      [code]
    );
    
    if (!existing) break;
    
    code = `${baseName}-${year}-${counter}`;
    counter++;
  }

  return code;
}

/**
 * Check if user exists by wallet address
 */
export async function userExists(walletAddress: string): Promise<boolean> {
  const result = await queryOne(
    'SELECT user_id FROM users WHERE wallet_address = ?',
    [walletAddress.toLowerCase()]
  );
  return result !== null;
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await queryOne(
    'SELECT user_id FROM users WHERE email = ?',
    [email.toLowerCase()]
  );
  return result !== null;
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  return await queryOne<User>(
    'SELECT * FROM users WHERE wallet_address = ?',
    [walletAddress.toLowerCase()]
  );
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  return await queryOne<User>(
    'SELECT * FROM users WHERE user_id = ?',
    [userId]
  );
}

/**
 * Get user by referral code
 */
export async function getUserByReferralCode(referralCode: string): Promise<User | null> {
  return await queryOne<User>(
    'SELECT * FROM users WHERE custom_referral_code = ?',
    [referralCode]
  );
}

/**
 * Create new user
 */
export async function createUser(userData: {
  walletAddress: string;
  customReferralCode: string;
  referrerWalletAddress?: string;
  referrerCode?: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  address: string;
  zipCode: string;
  country?: string;
}): Promise<number> {
  const userId = await insert(
    `INSERT INTO users (
      wallet_address, custom_referral_code, referrer_wallet_address, referrer_code,
      full_name, email, mobile_number, address, zip_code, country
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userData.walletAddress.toLowerCase(),
      userData.customReferralCode,
      userData.referrerWalletAddress?.toLowerCase() || null,
      userData.referrerCode || null,
      userData.fullName,
      userData.email.toLowerCase(),
      userData.mobileNumber,
      userData.address,
      userData.zipCode,
      userData.country || null,
    ]
  );

  // Create referral link entry
  await insert(
    `INSERT INTO referral_links (user_id, wallet_address, custom_code, link_url)
     VALUES (?, ?, ?, ?)`,
    [
      userId,
      userData.walletAddress.toLowerCase(),
      userData.customReferralCode,
      `${process.env.NEXT_PUBLIC_APP_URL}/join/${userData.customReferralCode}`,
    ]
  );

  // Initialize team stats
  await insert(
    'INSERT INTO team_stats (user_id, wallet_address) VALUES (?, ?)',
    [userId, userData.walletAddress.toLowerCase()]
  );

  return userId;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<number> {
  return await update(
    'UPDATE users SET last_login = NOW() WHERE user_id = ?',
    [userId]
  );
}

/**
 * Check if user is admin
 */
export async function isAdmin(walletAddress: string): Promise<boolean> {
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
  return walletAddress.toLowerCase() === adminWallet;
}
