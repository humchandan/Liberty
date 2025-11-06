import { CONTRACT_ERRORS } from './errors';

export function parseContractError(error: any): string {
  // Check for custom contract errors
  const errorData = error?.error?.data || error?.data;
  
  if (errorData && typeof errorData === 'string') {
    // Extract error name from data (0x signature)
    const errorSignature = errorData.substring(0, 10);
    
    // Map common error signatures
    const ERROR_SIGNATURES: Record<string, keyof typeof CONTRACT_ERRORS> = {
      '0x6697b232': 'InvalidAddress',
      '0xf2525922': 'DeadlineExpired',
      '0x5c427cd9': 'UnsupportedToken',
      '0x2c5211c6': 'InvalidAmount',
      '0x1f2a2005': 'InsufficientOrders',
      '0x8091d5f1': 'ExceedsUserLimit',
      '0xf645eedf': 'InsufficientTreasury',
      '0x3df4c05f': 'InvalidReferrer',
      '0xb90b26d7': 'ReferrerAlreadySet',
      '0x7e84b27e': 'NotYourOrder',
      '0x2d9ca900': 'AlreadyProcessed',
      '0x82b42900': 'NotEligible',
      '0x3df4a1a9': 'NoBonus',
      '0xfd85fecd': 'BonusHalted',
      '0x58d620b3': 'InvalidBatchSize',
      '0x9df09c5e': 'InvalidOrderId',
      '0x63b8b5f7': 'NotOverdue',
      '0x0adb31f4': 'ActiveOrdersExist',
      '0x56c35729': 'NoFundsToWithdraw'
    };
    
    const errorKey = ERROR_SIGNATURES[errorSignature];
    if (errorKey) {
      return CONTRACT_ERRORS[errorKey];
    }
  }
  
  // Check for nested error data with message
  if (errorData && typeof errorData === 'object' && errorData.message) {
    // Check if message contains known error names
    for (const [key, value] of Object.entries(CONTRACT_ERRORS)) {
      if (errorData.message.includes(key)) {
        return value;
      }
    }
  }
  
  // Check error message
  const errorMessage = error?.message || error?.reason || String(error);
  
  // Check for specific error names in message
  for (const [key, value] of Object.entries(CONTRACT_ERRORS)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  
  // Common MetaMask/wallet errors
  if (errorMessage.includes('user rejected') || error.code === 4001) {
    return 'Transaction rejected by user';
  }
  
  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds for gas fee';
  }
  
  if (errorMessage.includes('nonce too low')) {
    return 'Transaction nonce error - please try again';
  }
  
  if (errorMessage.includes('already known')) {
    return 'Transaction already pending';
  }
  
  // Check for gas estimation errors
  if (error.code === -32603 || errorMessage.includes('Internal JSON-RPC error')) {
    // Try to extract revert reason from nested data
    if (errorData && typeof errorData === 'object') {
      const revertReason = errorData.message || errorData.reason;
      if (revertReason) {
        // Parse revert reason for known errors
        for (const [key, value] of Object.entries(CONTRACT_ERRORS)) {
          if (revertReason.includes(key)) {
            return value;
          }
        }
        return `Transaction failed: ${revertReason}`;
      }
    }
    return 'Transaction would fail. Please check your inputs and try again.';
  }
  
  // Return original message if nothing matches
  return errorMessage || 'An unknown error occurred';
}
