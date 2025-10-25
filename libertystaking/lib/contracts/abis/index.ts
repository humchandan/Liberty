/**
 * Central export for all ABIs
 */
import ERC20_ABI_JSON from './ERC20.json';
import STAKING_ABI_JSON from './Staking.json';

export const ERC20_ABI = ERC20_ABI_JSON;
export const STAKING_ABI = STAKING_ABI_JSON;

export type ERC20ABI = typeof ERC20_ABI;
export type StakingABI = typeof STAKING_ABI;
