// src/services/ContractService.ts

import { ethers } from 'ethers';
import { STAKING_ABI, ERC20_ABI, CONTRACTS } from './index';

export interface OrderInfo {
  orderId: number;
  user: string;
  token: string;
  totalAmount: string;
  numUnits: number;
  stakeTime: number;
  maturityTime: number;
  apr: number;
  epochId: number;
  autoReinvest: boolean;
  paidOut: boolean;
  refunded: boolean;
}

export interface EpochInfo {
  epochId: number;
  startTime: number;
  totalOrders: number;
  isFull: boolean;
  allPaidOut: boolean;
}

export interface ReferralInfo {
  referrer: string;
  selfInvestedINRT: string;
  selfInvestedUSDT: string;
  accruedBonusINRT: string;
  accruedBonusUSDT: string;
  claimedBonusINRT: string;
  claimedBonusUSDT: string;
  lastBonusTime: number;
  bonusHaltedINRT: boolean;
  bonusHaltedUSDT: boolean;
}

export interface SolvencyStatus {
  isSolvent: boolean;
  totalAvailable: string;
  totalRequired: string;
  difference: string;
}

export interface TreasuryBreakdown {
  reserve: string;
  operational: string;
  admin1FeesINRT: string;
  admin1FeesUSDT: string;
  admin2FeesINRT: string;
  admin2FeesUSDT: string;
  activePrincipal: string;
  activeInterest: string;
}

export interface ReferralPercentages {
  l1: number;
  l2: number;
  l3: number;
}

export interface TimelockInfo {
  deploymentTime: number;
  unlockTime: number;
  isUnlocked: boolean;
  remainingTime: number;
}

export interface TreasurySurplus {
  surplus: string;
  canWithdraw: boolean;
}

export class ContractService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;

  constructor(provider: any) {
    this.provider = new ethers.providers.Web3Provider(provider);
    this.signer = this.provider.getSigner();
  }

  getTokenContract(tokenAddress: string) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
  }

  getStakingContract() {
    return new ethers.Contract(CONTRACTS.STAKING, STAKING_ABI, this.signer);
  }

  // ========== READ FUNCTIONS - CONSTANTS ==========

  async getINRTToken(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.INRT_TOKEN();
  }

  async getUSDTToken(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.USDT_TOKEN();
  }

  async getAdmin2Wallet(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.ADMIN_2_WALLET();
  }

  async getDeploymentTimestamp(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.DEPLOYMENT_TIMESTAMP();
    return result.toNumber();
  }

  async getTreasuryTimelock(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.TREASURY_TIMELOCK();
    return result.toNumber();
  }

  async getAdminCommissionBP(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.ADMIN_COMMISSION_BP();
    return result.toNumber();
  }

  async getInterestWithdrawalFeeBP(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.INTEREST_WITHDRAWAL_FEE_BP();
    return result.toNumber();
  }

  async getEpochTimeoutDays(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.EPOCH_TIMEOUT_DAYS();
    return result.toNumber();
  }

  async getUnclaimedPayoutDays(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.UNCLAIMED_PAYOUT_DAYS();
    return result.toNumber();
  }

  async getReferralClaimDays(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.REFERRAL_CLAIM_DAYS();
    return result.toNumber();
  }

  async getMinReferralClaimINRT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_REFERRAL_CLAIM_INRT();
    return result.toString();
  }

  async getMinReferralClaimUSDT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_REFERRAL_CLAIM_USDT();
    return result.toString();
  }

  async getMinBaseAPR(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_BASE_APR();
    return result.toNumber();
  }

  async getMaxBaseAPR(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.MAX_BASE_APR();
    return result.toNumber();
  }

  async getMinMaturityDays(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_MATURITY_DAYS();
    return result.toNumber();
  }

  async getMinOrderSizeINRT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_ORDER_SIZE_INRT();
    return result.toString();
  }

  async getMinOrderSizeUSDT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.MIN_ORDER_SIZE_USDT();
    return result.toString();
  }

  // ========== READ FUNCTIONS - STATE VARIABLES ==========

  async getOrderSizeINRT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.orderSizeINRT();
    return result.toString();
  }

  async getOrderSizeUSDT(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.orderSizeUSDT();
    return result.toString();
  }

  async getOrderSize(tokenAddress: string): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.getOrderSize(tokenAddress);
    return result.toString();
  }

  async getEpochMaxOrders(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.epochMaxOrders();
    return result.toNumber();
  }

  async getMaxOrdersPerUserPerEpoch(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.maxOrdersPerUserPerEpoch();
    return result.toNumber();
  }

  async getMaturityDays(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.maturityDays();
    return result.toNumber();
  }

  async getBaseAPR(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.baseAPR();
    return result.toNumber();
  }

  async getAutoReinvestBonusAPR(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.autoReinvestBonusAPR();
    return result.toNumber();
  }

  async getReferralMultiplierX(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.referralMultiplierX();
    return result.toNumber();
  }

  async getReferralL1BP(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.referralL1BP();
    return result.toNumber();
  }

  async getReferralL2BP(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.referralL2BP();
    return result.toNumber();
  }

  async getReferralL3BP(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.referralL3BP();
    return result.toNumber();
  }

  async getReferralPercentages(): Promise<ReferralPercentages> {
    const contract = this.getStakingContract();
    const result = await contract.getReferralPercentages();
    return {
      l1: result.l1.toNumber(),
      l2: result.l2.toNumber(),
      l3: result.l3.toNumber(),
    };
  }

  async getEpochCounter(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.epochCounter();
    return result.toNumber();
  }

  async getGlobalOrderCounter(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.globalOrderCounter();
    return result.toNumber();
  }

  async getTreasuryReserve(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.treasuryReserve();
    return result.toString();
  }

  async getTreasuryOperational(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.treasuryOperational();
    return result.toString();
  }

  async getAdmin1Fees(tokenAddress: string): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.admin1Fees(tokenAddress);
    return result.toString();
  }

  async getAdmin2Fees(tokenAddress: string): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.admin2Fees(tokenAddress);
    return result.toString();
  }

  async getTotalActivePrincipal(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.totalActivePrincipal();
    return result.toString();
  }

  async getTotalActiveInterest(): Promise<string> {
    const contract = this.getStakingContract();
    const result = await contract.totalActiveInterest();
    return result.toString();
  }

  async getActiveOrderCount(): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.activeOrderCount();
    return result.toNumber();
  }

  async getAdmin1Wallet(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.admin1Wallet();
  }

  async isPaused(): Promise<boolean> {
    const contract = this.getStakingContract();
    return await contract.paused();
  }

  async getOwner(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.owner();
  }

  async getPendingOwner(): Promise<string> {
    const contract = this.getStakingContract();
    return await contract.pendingOwner();
  }

  // ========== READ FUNCTIONS - COMPLEX GETTERS ==========

  async getSolvencyStatus(): Promise<SolvencyStatus> {
    const contract = this.getStakingContract();
    const result = await contract.getSolvencyStatus();
    return {
      isSolvent: result.isSolvent,
      totalAvailable: result.totalAvailable.toString(),
      totalRequired: result.totalRequired.toString(),
      difference: result.difference.toString(),
    };
  }

  async getTreasuryBreakdown(): Promise<TreasuryBreakdown> {
    const contract = this.getStakingContract();
    const result = await contract.getTreasuryBreakdown();
    return {
      reserve: result.reserve.toString(),
      operational: result.operational.toString(),
      admin1FeesINRT: result.admin1FeesINRT.toString(),
      admin1FeesUSDT: result.admin1FeesUSDT.toString(),
      admin2FeesINRT: result.admin2FeesINRT.toString(),
      admin2FeesUSDT: result.admin2FeesUSDT.toString(),
      activePrincipal: result.activePrincipal.toString(),
      activeInterest: result.activeInterest.toString(),
    };
  }

  async getTimelockInfo(): Promise<TimelockInfo> {
    const contract = this.getStakingContract();
    const result = await contract.getTimelockInfo();
    return {
      deploymentTime: result.deploymentTime.toNumber(),
      unlockTime: result.unlockTime.toNumber(),
      isUnlocked: result.isUnlocked,
      remainingTime: result.remainingTime.toNumber(),
    };
  }

  async getTreasurySurplus(tokenAddress: string): Promise<TreasurySurplus> {
    const contract = this.getStakingContract();
    const result = await contract.getTreasurySurplus(tokenAddress);
    return {
      surplus: result.surplus.toString(),
      canWithdraw: result.canWithdraw,
    };
  }

  async getEpochInfo(epochId: number): Promise<EpochInfo> {
    const contract = this.getStakingContract();
    const epoch = await contract.getEpochInfo(epochId);
    return {
      epochId: epoch.epochId.toNumber(),
      startTime: epoch.startTime.toNumber(),
      totalOrders: epoch.totalOrders.toNumber(),
      isFull: epoch.isFull,
      allPaidOut: epoch.allPaidOut,
    };
  }

  async getOrder(orderId: number): Promise<OrderInfo> {
    const contract = this.getStakingContract();
    const order = await contract.orders(orderId);
    return {
      orderId: order.orderId.toNumber(),
      user: order.user,
      token: order.token,
      totalAmount: order.totalAmount.toString(),
      numUnits: order.numUnits.toNumber(),
      stakeTime: order.stakeTime.toNumber(),
      maturityTime: order.maturityTime.toNumber(),
      apr: order.apr.toNumber(),
      epochId: order.epochId.toNumber(),
      autoReinvest: order.autoReinvest,
      paidOut: order.paidOut,
      refunded: order.refunded,
    };
  }

  async getUserOrders(user: string): Promise<number[]> {
    const contract = this.getStakingContract();
    const result = await contract.getUserOrders(user);
    return result.map((n: ethers.BigNumber) => n.toNumber());
  }

  async getUserOrdersPerEpoch(user: string, epochId: number): Promise<number> {
    const contract = this.getStakingContract();
    const result = await contract.userOrdersPerEpoch(user, epochId);
    return result.toNumber();
  }

  async getReferralInfo(user: string): Promise<ReferralInfo> {
    const contract = this.getStakingContract();
    const ref = await contract.referrals(user);
    return {
      referrer: ref.referrer,
      selfInvestedINRT: ref.selfInvestedINRT.toString(),
      selfInvestedUSDT: ref.selfInvestedUSDT.toString(),
      accruedBonusINRT: ref.accruedBonusINRT.toString(),
      accruedBonusUSDT: ref.accruedBonusUSDT.toString(),
      claimedBonusINRT: ref.claimedBonusINRT.toString(),
      claimedBonusUSDT: ref.claimedBonusUSDT.toString(),
      lastBonusTime: ref.lastBonusTime.toNumber(),
      bonusHaltedINRT: ref.bonusHaltedINRT,
      bonusHaltedUSDT: ref.bonusHaltedUSDT,
    };
  }

  // ========== TOKEN FUNCTIONS ==========

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const contract = this.getTokenContract(tokenAddress);
    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    return ethers.utils.formatUnits(balance, decimals);
  }

  async checkAllowance(tokenAddress: string, owner: string): Promise<string> {
    const contract = this.getTokenContract(tokenAddress);
    const allowance = await contract.allowance(owner, CONTRACTS.STAKING);
    const decimals = await contract.decimals();
    return ethers.utils.formatUnits(allowance, decimals);
  }

  async approveToken(tokenAddress: string, amount: string): Promise<ethers.ContractTransaction> {
    const contract = this.getTokenContract(tokenAddress);
    const decimals = await contract.decimals();
    const amountWei = ethers.utils.parseUnits(amount, decimals);
    return await contract.approve(CONTRACTS.STAKING, amountWei);
  }

  // ========== USER WRITE FUNCTIONS ==========

  async setReferrer(referrer: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setReferrer(referrer);
  }

  async stake(
    tokenAddress: string,
    amount: string,
    autoReinvest: boolean,
    deadline: number
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const amountInUnits = ethers.utils.parseUnits(amount, 6);

    console.log('🔍 Stake Debug Info:');
    console.log('  Token:', tokenAddress);
    console.log('  Amount (raw):', amount);
    console.log('  Amount (units):', amountInUnits.toString());
    console.log('  Auto Reinvest:', autoReinvest);
    console.log('  Deadline:', deadline);

    try {
      console.log('⛽ Estimating gas...');
      const gasEstimate = await contract.estimateGas.stake(
        tokenAddress,
        amountInUnits,
        autoReinvest,
        deadline
      );
      console.log('✅ Gas estimate:', gasEstimate.toString());

      const tx = await contract.stake(tokenAddress, amountInUnits, autoReinvest, deadline, {
        gasLimit: gasEstimate.mul(120).div(100),
      });

      console.log('✅ Transaction sent:', tx.hash);
      return tx;
    } catch (error: any) {
      console.error('❌ Stake transaction error:', error);
      if (error.error && error.error.data) {
        console.error('Revert data:', error.error.data);
      }
      throw error;
    }
  }

  async claimOrder(
    orderId: number,
    deadline: number,
    minPayout: string = '0'
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const minPayoutWei = ethers.utils.parseUnits(minPayout, 6);
    return await contract.claimOrder(orderId, deadline, minPayoutWei);
  }

  async claimMultipleOrders(
    orderIds: number[],
    deadline: number,
    minTotalPayout: string = '0'
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const minTotalPayoutWei = ethers.utils.parseUnits(minTotalPayout, 6);
    return await contract.claimMultipleOrders(orderIds, deadline, minTotalPayoutWei);
  }

  async claimReferralBonus(tokenAddress: string, deadline: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.claimReferralBonus(tokenAddress, deadline);
  }

  async refundOrder(orderId: number, deadline: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.refundOrder(orderId, deadline);
  }

  async depositToTreasury(
    tokenAddress: string,
    amount: string,
    toReserve: boolean = false
  ): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const amountWei = ethers.utils.parseUnits(amount, 6);
    return await contract.depositToTreasury(tokenAddress, amountWei, toReserve);
  }

  // ========== ADMIN FUNCTIONS ==========

  async setAdmin1Wallet(newAdmin: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setAdmin1Wallet(newAdmin);
  }

  async triggerNewEpoch(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.triggerNewEpoch();
  }

  async approveMaturedPayout(epochId: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.approveMaturedPayout(epochId);
  }

  async setOrderSizeINRT(newSize: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const newSizeWei = ethers.utils.parseUnits(newSize, 6);
    return await contract.setOrderSizeINRT(newSizeWei);
  }

  async setOrderSizeUSDT(newSize: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    const newSizeWei = ethers.utils.parseUnits(newSize, 6);
    return await contract.setOrderSizeUSDT(newSizeWei);
  }

  async setMaxOrdersPerUserPerEpoch(max: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setMaxOrdersPerUserPerEpoch(max);
  }

  async setEpochMaxOrders(max: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setEpochMaxOrders(max);
  }

  async setMaturityDays(days: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setMaturityDays(days);
  }

  async setBaseAPR(apr: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setBaseAPR(apr);
  }

  async setAutoReinvestBonusAPR(apr: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setAutoReinvestBonusAPR(apr);
  }

  async setReferralMultiplierX(multiplier: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setReferralMultiplierX(multiplier);
  }

  async setReferralL1BP(bp: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setReferralL1BP(bp);
  }

  async setReferralL2BP(bp: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setReferralL2BP(bp);
  }

  async setReferralL3BP(bp: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setReferralL3BP(bp);
  }

  async setAllReferralPercentages(l1BP: number, l2BP: number, l3BP: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.setAllReferralPercentages(l1BP, l2BP, l3BP);
  }

  async pause(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.pause();
  }

  async unpause(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.unpause();
  }

  async claimUnclaimedPayout(orderId: number): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.claimUnclaimedPayout(orderId);
  }

  async escheatOverdueReferrals(user: string, token: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.escheatOverdueReferrals(user, token);
  }

  async withdrawAdminFees(token: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.withdrawAdminFees(token);
  }

  async withdrawTreasurySurplus(tokenAddress: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.withdrawTreasurySurplus(tokenAddress);
  }

  async transferOwnership(newOwner: string): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.transferOwnership(newOwner);
  }

  async acceptOwnership(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.acceptOwnership();
  }

  async renounceOwnership(): Promise<ethers.ContractTransaction> {
    const contract = this.getStakingContract();
    return await contract.renounceOwnership();
  }

  // ========== HELPER FUNCTIONS ==========

  getDeadline(minutesFromNow: number = 20): number {
    return Math.floor(Date.now() / 1000) + minutesFromNow * 60;
  }

  formatTokenAmount(amount: string, decimals: number = 6): string {
    return ethers.utils.formatUnits(amount, decimals);
  }

  parseTokenAmount(amount: string, decimals: number = 6): string {
    return ethers.utils.parseUnits(amount, decimals).toString();
  }

  formatAPR(basisPoints: number): string {
    return (basisPoints / 100).toFixed(2) + '%';
  }

  parseDateToTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  calculateInterest(principal: string, aprBP: number, days: number): string {
    const principalBN = ethers.BigNumber.from(principal);
    const interest = principalBN.mul(aprBP).mul(days).div(10000 * 365);
    return interest.toString();
  }

  calculateTotalPayout(principal: string, grossInterest: string, withdrawalFeeBP: number): string {
    const principalBN = ethers.BigNumber.from(principal);
    const grossInterestBN = ethers.BigNumber.from(grossInterest);
    const fee = grossInterestBN.mul(withdrawalFeeBP).div(10000);
    const netInterest = grossInterestBN.sub(fee);
    return principalBN.add(netInterest).toString();
  }

  formatTimelockRemaining(remainingSeconds: number): string {
    if (remainingSeconds === 0) return 'Unlocked';
    
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    
    if (days > 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      return `${years}y ${remainingDays}d`;
    }
    
    return `${days}d ${hours}h`;
  }
}
