import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Liberty Finance',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '4ee7fd7bb097aa1e377bea8703eae0b6',
  chains: [avalancheFuji],
  ssr: true,
});
