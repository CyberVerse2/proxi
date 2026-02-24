import { encodeFunctionData, formatUnits } from 'viem';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/config/constants';
import { ERC20_ABI, TOKEN_DECIMALS } from './constants';
import type { SwapWallet } from './wallet';

export function createGetUsdcBalance(getWallet: () => SwapWallet | null) {
  return async (): Promise<string> => {
    const wallet = getWallet();
    if (!wallet) return '0';
    try {
      const provider = await wallet.getEthereumProvider();
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [wallet.address as `0x${string}`]
      });
      const result = await provider.request({
        method: 'eth_call',
        params: [{ to: USDC_ADDRESS, data }, 'latest']
      });
      return formatUnits(BigInt(result as string), USDC_DECIMALS);
    } catch {
      return '0';
    }
  };
}

export function createGetTokenBalance(getWallet: () => SwapWallet | null) {
  return async (tokenAddress: string): Promise<string> => {
    const wallet = getWallet();
    if (!wallet) return '0';
    try {
      const provider = await wallet.getEthereumProvider();
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [wallet.address as `0x${string}`]
      });
      const result = await provider.request({
        method: 'eth_call',
        params: [{ to: tokenAddress, data }, 'latest']
      });
      return formatUnits(BigInt(result as string), TOKEN_DECIMALS);
    } catch {
      return '0';
    }
  };
}
