import {
  USDC_DECIMALS,
  USDC_ADDRESS,
  SLIPPAGE_BPS,
  BASE_CHAIN_ID,
  ZX_API_BASE
} from '@/lib/config/constants';
import { ZX_API_KEY } from './internal';

/**
 * Call 0x price API to find how many tokens the proxy's chat price buys (= 1 message).
 * Returns the human-readable token amount (e.g. 1234.56 tokens).
 */
export async function getTokensPerMessage(
  tokenAddress: string,
  pricePerMessage: number
): Promise<number> {
  if (!ZX_API_KEY) return 0;
  try {
    const sellAmount = BigInt(Math.round(pricePerMessage * 10 ** USDC_DECIMALS)).toString();
    const params = new URLSearchParams({
      chainId: String(BASE_CHAIN_ID),
      sellToken: USDC_ADDRESS,
      buyToken: tokenAddress,
      sellAmount,
      slippageBps: SLIPPAGE_BPS
    });
    const url = `${ZX_API_BASE}/price?${params}`;
    const res = await fetch(url, {
      headers: { '0x-api-key': ZX_API_KEY, '0x-version': 'v2' },
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[token] 0x price API error:', res.status, errText);
      return 0;
    }
    const data = await res.json();
    return Number(data.buyAmount) / 1e18;
  } catch {
    return 0;
  }
}

/**
 * Same as getTokensPerMessage but returns the raw bigint amount (18 decimals)
 * suitable for ERC-20 transfer calls.
 */
export async function getRawTokensPerMessage(
  tokenAddress: string,
  pricePerMessage: number
): Promise<bigint> {
  if (!ZX_API_KEY) return 0n;
  try {
    const sellAmount = BigInt(Math.round(pricePerMessage * 10 ** USDC_DECIMALS)).toString();
    const params = new URLSearchParams({
      chainId: String(BASE_CHAIN_ID),
      sellToken: USDC_ADDRESS,
      buyToken: tokenAddress,
      sellAmount,
      slippageBps: SLIPPAGE_BPS
    });
    const url = `${ZX_API_BASE}/price?${params}`;
    const res = await fetch(url, {
      headers: { '0x-api-key': ZX_API_KEY, '0x-version': 'v2' },
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[token] 0x price API error:', res.status, errText);
      return 0n;
    }
    const data = await res.json();
    return BigInt(data.buyAmount ?? '0');
  } catch {
    return 0n;
  }
}
