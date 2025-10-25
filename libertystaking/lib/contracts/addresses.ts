/**
 * Contract Addresses Configuration
 * Add new token addresses here as they become available
 */

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
}

// Network-specific addresses
const AVALANCHE_FUJI_ADDRESSES = {
  STAKING: process.env.NEXT_PUBLIC_STAKING_ADDRESS!,
  INRT: process.env.NEXT_PUBLIC_INRT_ADDRESS!,
  USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS!,
};

const AVALANCHE_MAINNET_ADDRESSES = {
  STAKING: process.env.NEXT_PUBLIC_STAKING_ADDRESS_MAINNET || '',
  INRT: process.env.NEXT_PUBLIC_INRT_ADDRESS_MAINNET || '',
  USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS_MAINNET || '',
};

// Current network (change this based on environment)
const CURRENT_NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'fuji';

export const CONTRACTS = CURRENT_NETWORK === 'mainnet' 
  ? AVALANCHE_MAINNET_ADDRESSES 
  : AVALANCHE_FUJI_ADDRESSES;

// Supported tokens configuration
export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
  INRT: {
    symbol: 'INRT',
    name: 'Indian Rupee Token',
    address: CONTRACTS.INRT,
    decimals: 6,
    icon: '/tokens/inrt.png',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: CONTRACTS.USDT,
    decimals: 6,
    icon: '/tokens/usdt.png',
  },
  // Add new tokens here in the future:
  // USDC: {
  //   symbol: 'USDC',
  //   name: 'USD Coin',
  //   address: process.env.NEXT_PUBLIC_USDC_ADDRESS!,
  //   decimals: 6,
  //   icon: '/tokens/usdc.png',
  // },
};

// Helper function to get token config
export function getTokenConfig(symbolOrAddress: string): TokenConfig | undefined {
  // Check by symbol
  if (SUPPORTED_TOKENS[symbolOrAddress.toUpperCase()]) {
    return SUPPORTED_TOKENS[symbolOrAddress.toUpperCase()];
  }
  
  // Check by address
  const address = symbolOrAddress.toLowerCase();
  return Object.values(SUPPORTED_TOKENS).find(
    token => token.address.toLowerCase() === address
  );
}

// Get all supported token symbols
export function getSupportedTokenSymbols(): string[] {
  return Object.keys(SUPPORTED_TOKENS);
}

// Get all supported token addresses
export function getSupportedTokenAddresses(): string[] {
  return Object.values(SUPPORTED_TOKENS).map(token => token.address);
}

// Validate if contracts are configured
export function validateContracts(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!CONTRACTS.STAKING || CONTRACTS.STAKING === '') {
    missing.push('NEXT_PUBLIC_STAKING_ADDRESS');
  }
  if (!CONTRACTS.INRT || CONTRACTS.INRT === '') {
    missing.push('NEXT_PUBLIC_INRT_ADDRESS');
  }
  if (!CONTRACTS.USDT || CONTRACTS.USDT === '') {
    missing.push('NEXT_PUBLIC_USDT_ADDRESS');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}