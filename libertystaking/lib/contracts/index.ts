/**
 * Main export file for contracts module
 * This is the MAIN entry point - everything exports from here
 */

// Export ABIs from the abis folder
export { ERC20_ABI, STAKING_ABI } from './abis';
export type { ERC20ABI, StakingABI } from './abis';

// Export addresses and token configs
export { 
  CONTRACTS, 
  SUPPORTED_TOKENS, 
  getTokenConfig,
  getSupportedTokenSymbols,
  getSupportedTokenAddresses,
  validateContracts  // ← ADD THIS
} from './addresses';
export type { TokenConfig } from './addresses';

// Export the ContractService class
export { ContractService } from './ContractService';
export type { TokenInfo } from './ContractService';
