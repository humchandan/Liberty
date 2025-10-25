import { ethers } from 'ethers';
import { ERC20_ABI, STAKING_ABI } from './abis';
import { CONTRACTS, getTokenConfig } from './addresses';

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  currentEpoch: number;
  availableOrders: number;
  balance: string;
  decimals: number;
  isActive: boolean;
  orderSize: string;
}

export class ContractService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;

  constructor(provider: any) {
    this.provider = new ethers.providers.Web3Provider(provider);
    this.signer = this.provider.getSigner();
  }

  /**
 * Check if epoch is full and trigger new one if needed (admin only)
 */
async checkAndTriggerEpochIfNeeded(): Promise<boolean> {
  try {
    const contract = this.getStakingContract();
    const currentEpoch = await contract.currentEpochId();
    const epochInfo = await contract.epochs(currentEpoch);
    
    // Get max orders
    let maxOrders = 6300;
    try {
      const constants = await contract.getConstants();
      maxOrders = constants.maxOrdersPerEpoch.toNumber();
    } catch (error) {
      console.warn('Using default max orders');
    }
    
    const totalOrders = epochInfo.totalOrders.toNumber();
    
    // If epoch is full, try to trigger new one
    if (totalOrders >= maxOrders) {
      console.log('🚨 Epoch is full, triggering new epoch...');
      const tx = await contract.triggerNewEpoch();
      await tx.wait();
      console.log('✅ New epoch triggered successfully');
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Failed to check/trigger epoch:', error);
    // If not admin or other error, just return false
    return false;
  }
}

/**
 * Set Referrer (required before first stake)
 */
async setReferrer(referrerAddress: string): Promise<ethers.ContractTransaction> {
  const contract = this.getStakingContract();
  return await contract.setReferrer(referrerAddress);
}

/**
 * Get user's referrer address
 */
async getUserReferrer(userAddress: string): Promise<string> {
  const contract = this.getStakingContract();
  return await contract.referrers(userAddress);
}

  /**
   * Get Token Contract Instance
   */
  getTokenContract(tokenAddress: string) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
  }

  /**
   * Get Staking Contract Instance
   */
  getStakingContract() {
    return new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, this.signer);
  }

  /**
   * Get Token Balance
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const contract = this.getTokenContract(tokenAddress);
    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  }

  /**
   * Check Token Allowance
   */
  async checkAllowance(tokenAddress: string, owner: string): Promise<string> {
    const contract = this.getTokenContract(tokenAddress);
    const allowance = await contract.allowance(owner, CONTRACTS.STAKING);
    const decimals = await contract.decimals();
    return ethers.utils.formatUnits(allowance, decimals);
  }

  /**
   * Approve Token for Staking
   */
  async approveToken(tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> {
    const contract = this.getTokenContract(tokenAddress);
    const decimals = await contract.decimals();
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    return await contract.approve(CONTRACTS.STAKING, amountWei);
  }

  /**
   * Stake Tokens
   */
  async stake(tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> {
    const stakingContract = this.getStakingContract();
    const tokenContract = this.getTokenContract(tokenAddress);
    const decimals = await tokenContract.decimals();
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    
    return await stakingContract.stake(tokenAddress, amountWei);
  }

  /**
   * Get Current Epoch ID
   */
  async getCurrentEpoch(): Promise<number> {
    const contract = this.getStakingContract();
    const epochId = await contract.currentEpochId();
    return epochId.toNumber();
  }

  /**
 * Get Epoch Info
 */
async getEpochInfo(epochId: number) {
  const contract = this.getStakingContract();
  const epoch = await contract.epochs(epochId);
  
  // Staked amounts are in INRT (6 decimals)
  const decimals = 6;
  
  return {
    epochId: epoch.epochId.toNumber(),
    startTime: epoch.startTime.toNumber(),
    totalOrders: epoch.totalOrders.toNumber(),
    totalStaked: ethers.utils.formatUnits(epoch.totalStaked, decimals),
    isActive: epoch.isActive,
    autoTriggered: epoch.autoTriggered,
  };
}


  /**
   * Get Token Info from Staking Contract
   */
  async getTokenInfoFromContract(tokenAddress: string) {
    const contract = this.getStakingContract();
    const tokenInfo = await contract.supportedTokens(tokenAddress);
    return {
      tokenAddress: tokenInfo.tokenAddress,
      decimals: tokenInfo.decimals,
      isActive: tokenInfo.isActive,
      minStakeAmount: ethers.utils.formatUnits(tokenInfo.minStakeAmount, tokenInfo.decimals),
      orderSize: ethers.utils.formatUnits(tokenInfo.orderSize, tokenInfo.decimals),
    };
  }

  /**
 * Get Complete Token Info
 */
async getTokenInfo(tokenAddress: string, userAddress: string): Promise<TokenInfo> {
  const tokenConfig = getTokenConfig(tokenAddress);
  if (!tokenConfig) {
    throw new Error(`Token ${tokenAddress} not supported`);
  }

  const stakingContract = this.getStakingContract();
  const tokenContract = this.getTokenContract(tokenAddress);
  
  console.log(`🔍 Fetching info for ${tokenConfig.symbol}...`);
  
  const [
    name,
    balance,
    currentEpoch,
    tokenInfo,
  ] = await Promise.all([
    tokenContract.name(),
    this.getTokenBalance(tokenAddress, userAddress),
    this.getCurrentEpoch(),
    this.getTokenInfoFromContract(tokenAddress),
  ]);

  console.log(`📊 Current Epoch: ${currentEpoch}`);

  // Get epoch info
  const epochInfo = await stakingContract.epochs(currentEpoch);
  const totalOrdersTaken = epochInfo.totalOrders.toNumber();
  
  console.log(`📅 Epoch ${currentEpoch} - Orders taken: ${totalOrdersTaken}`);
  
  // Get max orders per epoch from contract
  let maxOrders = 6300; // Your contract value
  try {
    const constants = await stakingContract.getConstants();
    maxOrders = constants.maxOrdersPerEpoch.toNumber();
    console.log(`✅ Max orders from contract: ${maxOrders}`);
  } catch (error) {
    console.warn('⚠️ Using hardcoded max orders:', maxOrders);
  }
  
  // Calculate available orders
  const availableOrders = Math.max(0, maxOrders - totalOrdersTaken);
  
  console.log(`🎯 Available orders: ${availableOrders} (${maxOrders} - ${totalOrdersTaken})`);

  return {
    symbol: tokenConfig.symbol,
    name,
    address: tokenAddress,
    currentEpoch,
    availableOrders,
    balance,
    decimals: tokenConfig.decimals, // ✅ Use decimals from config
    isActive: tokenInfo.isActive,
    orderSize: tokenInfo.orderSize,
  };
}
/**
 * Get Primary Admin Address
 */
async getPrimaryAdminAddress(): Promise<string> {
  const contract = this.getStakingContract();
  return await contract.primaryAdminWallet();
}

/**
 * Get Secondary Admin Address
 */
async getSecondaryAdminAddress(): Promise<string> {
  const contract = this.getStakingContract();
  return await contract.secondaryAdminWallet();
}

/**
 * Get Primary Admin Accumulated Fees
 */
async getPrimaryAdminFees(): Promise<string> {
  const contract = this.getStakingContract();
  const fees = await contract.accumulatedPrimaryAdminFees();
  return ethers.utils.formatUnits(fees, 6); // INRT decimals
}

/**
 * Get Secondary Admin Accumulated Fees
 */
async getSecondaryAdminFees(): Promise<string> {
  const contract = this.getStakingContract();
  const fees = await contract.accumulatedSecondaryAdminFees();
  return ethers.utils.formatUnits(fees, 6); // INRT decimals
}

/**
 * Claim Primary Admin Fees
 */
async claimPrimaryAdminFees(): Promise<ethers.ContractTransaction> {
  const contract = this.getStakingContract();
  return await contract.claimPrimaryAdminFees();
}

/**
 * Claim Secondary Admin Fees
 */
async claimSecondaryAdminFees(): Promise<ethers.ContractTransaction> {
  const contract = this.getStakingContract();
  return await contract.claimSecondaryAdminFees();
}

/**
 * Auto-detect admin type and get available fees
 */
async getAdminFeesForConnectedWallet(walletAddress: string): Promise<{
  isPrimary: boolean;
  isSecondary: boolean;
  availableFees: string;
  adminType: 'primary' | 'secondary' | null;
}> {
  const [primaryAdmin, secondaryAdmin] = await Promise.all([
    this.getPrimaryAdminAddress(),
    this.getSecondaryAdminAddress(),
  ]);

  const isPrimary = walletAddress.toLowerCase() === primaryAdmin.toLowerCase();
  const isSecondary = walletAddress.toLowerCase() === secondaryAdmin.toLowerCase();

  let availableFees = '0';
  let adminType: 'primary' | 'secondary' | null = null;

  if (isPrimary) {
    availableFees = await this.getPrimaryAdminFees();
    adminType = 'primary';
  } else if (isSecondary) {
    availableFees = await this.getSecondaryAdminFees();
    adminType = 'secondary';
  }

  return {
    isPrimary,
    isSecondary,
    availableFees,
    adminType,
  };
}

/**
 * Auto-claim admin fees based on connected wallet
 */
async claimAdminFeesAuto(walletAddress: string): Promise<ethers.ContractTransaction> {
  const adminInfo = await this.getAdminFeesForConnectedWallet(walletAddress);
  
  if (adminInfo.adminType === 'primary') {
    return await this.claimPrimaryAdminFees();
  } else if (adminInfo.adminType === 'secondary') {
    return await this.claimSecondaryAdminFees();
  } else {
    throw new Error('Connected wallet is not an admin');
  }
}

  
  /**
   * Get User Orders
   */
  async getUserOrders(userAddress: string) {
    const contract = this.getStakingContract();
    return await contract.getUserOrders(userAddress);
  }

  /**
   * Get Referral Info
   */
  async getReferralInfo(userAddress: string) {
    const contract = this.getStakingContract();
    const info = await contract.getReferralInfo(userAddress);
    return {
      stats: {
        level1Count: info.stats.level1Count.toNumber(),
        level2Count: info.stats.level2Count.toNumber(),
        level3Count: info.stats.level3Count.toNumber(),
        totalEarned: ethers.utils.formatUnits(info.stats.totalEarned, 18),
      },
      pending: ethers.utils.formatUnits(info.pending, 18),
      claimed: ethers.utils.formatUnits(info.claimed, 18),
      level1: info.level1,
    };
  }

  /**
   * Claim Referral Rewards
   */
  async claimReferralRewards(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.claimReferralRewards();
  }

  /**
 * Get Platform Stats
 */
async getPlatformStats() {
  const contract = this.getStakingContract();
  const stats = await contract.getPlatformStats();
  
  // Platform stats are in INRT (6 decimals)
  const decimals = 6;
  
  return {
    totalOrders: stats.totalOrders.toNumber(),
    totalStaked: ethers.utils.formatUnits(stats.totalStaked, decimals),
    totalPaid: ethers.utils.formatUnits(stats.totalPaid, decimals),
    activeOrders: stats.activeOrders.toNumber(),
    pendingPayouts: stats.pendingPayouts.toNumber(),
    treasury: ethers.utils.formatUnits(stats.treasury, decimals),
  };
}


  /**
   * Get Current APR
   */
  async getCurrentAPR(): Promise<number> {
    const contract = this.getStakingContract();
    const apr = await contract.currentAPR();
    return apr.toNumber() / 100; // Convert basis points to percentage
  }

  /**
   * Trigger New Epoch (Admin only)
   */
  async triggerNewEpoch(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.triggerNewEpoch();
  }
}
