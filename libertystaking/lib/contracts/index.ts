/**
 * Main export file for contracts module
 * This is the MAIN entry point - everything exports from here
 */

// Import Staking ABI from JSON file
import StakingABIJson from './abis/Staking.json';

// ERC20 ABI as human-readable format
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

// Export Staking ABI
export const STAKING_ABI = StakingABIJson;

// Type exports for ABIs
export type ERC20ABI = typeof ERC20_ABI;
export type StakingABI = typeof StakingABIJson;

// Export addresses and token configs
export { 
  CONTRACTS, 
  SUPPORTED_TOKENS, 
  getTokenConfig,
  getSupportedTokenSymbols,
  getSupportedTokenAddresses,
  validateContracts
} from './addresses';
export type { TokenConfig } from './addresses';

// Export the ContractService class
export { ContractService } from './ContractService';

// Export types from ContractService
export type { 
  OrderInfo,
  EpochInfo,
  ReferralInfo,
  UserInvestmentSummary
} from './ContractService';
