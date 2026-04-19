import { basename } from 'node:path';
import { createPublicClient, decodeEventLog, http } from 'viem';
import { bsc } from 'viem/chains';
import { CREATOR_FEE_PERCENT, PLATFORM_FEE_PERCENT, USDC_ADDRESS } from '@/lib/config/constants';
import { getDeployerAccount, PROXI_FOUNDER_WALLET } from './client';
import {
  BSC_RPC_URL,
  FOUR_MEME_API_BASE,
  TOKEN_CREATE_EVENT,
  TOKEN_MANAGER2_ABI,
  TOKEN_MANAGER2_BSC,
} from './constants';
import { generateNonce, loginWithSignature } from './auth';

export interface FourMemeCreateParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
}

type PublicConfigItem = {
  symbol?: string;
  symbolAddress?: string;
  totalBAmount?: string | number;
  totalAmount?: string | number;
  saleRate?: string | number;
  status?: string;
};

function toHex(value: string): `0x${string}` {
  if (value.startsWith('0x')) return value as `0x${string}`;
  if (/^[0-9a-fA-F]+$/.test(value)) return (`0x${value}`) as `0x${string}`;
  return (`0x${Buffer.from(value, 'base64').toString('hex')}`) as `0x${string}`;
}

async function fetchImageBlob(imageUrl: string | undefined, symbol: string) {
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') ?? 'image/png';
        return {
          blob: new Blob([arrayBuffer], { type: contentType }),
          filename: basename(new URL(imageUrl).pathname) || `${symbol.toLowerCase()}.png`,
        };
      }
    } catch {
      // Fall back to generated SVG below.
    }
  }

  // Four.meme rejects our SVG fallback uploads, so use a tiny valid PNG instead.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iJ2QAAAAASUVORK5CYII=';
  return {
    blob: new Blob([Buffer.from(pngBase64, 'base64')], { type: 'image/png' }),
    filename: `${symbol.toLowerCase()}.png`,
  };
}

async function uploadImage(accessToken: string, imageUrl: string | undefined, symbol: string) {
  const { blob, filename } = await fetchImageBlob(imageUrl, symbol);
  const form = new FormData();
  form.append('file', blob, filename);

  const res = await fetch(`${FOUR_MEME_API_BASE}/private/token/upload`, {
    method: 'POST',
    headers: { 'meme-web-access': accessToken },
    body: form,
  });

  const data = await res.json();
  if (!res.ok || (data.code !== '0' && data.code !== 0)) {
    throw new Error(`Four.meme image upload failed: ${JSON.stringify(data)}`);
  }

  return String(data.data);
}

async function fetchPublicConfig(): Promise<PublicConfigItem[]> {
  const res = await fetch(`${FOUR_MEME_API_BASE}/public/config`);
  const data = await res.json();
  if (!res.ok || (data.code !== '0' && data.code !== 0) || !Array.isArray(data.data)) {
    throw new Error(`Four.meme public config failed: ${JSON.stringify(data)}`);
  }
  return data.data as PublicConfigItem[];
}

export function pickUsdcRaisedToken(configs: PublicConfigItem[]) {
  const published = configs.filter((item) => item.status === 'PUBLISH');
  const candidates = published.length > 0 ? published : configs;
  const direct = candidates.find((item) => item.symbolAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase());
  if (direct) return direct;

  const bySymbol = candidates.find((item) => item.symbol?.toUpperCase() === 'USDC');
  if (bySymbol) return bySymbol;

  throw new Error('Four.meme public config does not expose a USDC raised token on BSC');
}

export function buildTokenTaxInfo() {
  if (!PROXI_FOUNDER_WALLET) {
    throw new Error('Missing PROXI_FOUNDER_WALLET_ADDRESS or PLATFORM_WALLET_ADDRESS');
  }

  return {
    feeRate: 1,
    burnRate: 0,
    divideRate: 0,
    liquidityRate: 0,
    recipientRate: 100,
    recipientAddress: PROXI_FOUNDER_WALLET,
    minSharing: 100000,
  };
}

async function calculateCreationFeeWei(preSale: string) {
  const client = createPublicClient({ chain: bsc, transport: http(BSC_RPC_URL) });
  const launchFee = await client.readContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TOKEN_MANAGER2_ABI,
    functionName: '_launchFee',
  });

  const presaleWei = BigInt(Math.round(parseFloat(preSale || '0') * 1e18));
  if (presaleWei === 0n) return launchFee;

  const tradingFeeRate = await client.readContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TOKEN_MANAGER2_ABI,
    functionName: '_tradingFeeRate',
  });

  return launchFee + presaleWei + (presaleWei * tradingFeeRate) / 10000n;
}

export async function createFourMemeTokenPayload(params: FourMemeCreateParams) {
  const account = getDeployerAccount();
  const nonce = await generateNonce(account.address);
  const signedMessage = await account.signMessage({ message: `You are sign in Meme ${nonce}` });
  const accessToken = await loginWithSignature(account.address, signedMessage);
  const imgUrl = await uploadImage(accessToken, params.imageUrl, params.symbol);
  const configs = await fetchPublicConfig();
  const raisedToken = pickUsdcRaisedToken(configs);
  const preSale = '0';

  const body = {
    name: params.name,
    shortName: params.symbol,
    desc: params.description,
    totalSupply:
      typeof raisedToken.totalAmount !== 'undefined' ? Number(raisedToken.totalAmount) : 1_000_000_000,
    raisedAmount:
      typeof raisedToken.totalBAmount !== 'undefined' ? Number(raisedToken.totalBAmount) : 24,
    saleRate: typeof raisedToken.saleRate !== 'undefined' ? Number(raisedToken.saleRate) : 0.8,
    reserveRate: 0,
    imgUrl,
    raisedToken,
    launchTime: Date.now(),
    funGroup: false,
    label: 'AI',
    lpTradingFee: 0.0025,
    preSale,
    clickFun: false,
    symbol: raisedToken.symbol ?? 'USDC',
    dexType: 'PANCAKE_SWAP',
    rushMode: false,
    onlyMPC: false,
    feePlan: false,
    tokenTaxInfo: buildTokenTaxInfo(),
  };

  const res = await fetch(`${FOUR_MEME_API_BASE}/private/token/create`, {
    method: 'POST',
    headers: {
      'meme-web-access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || (data.code !== '0' && data.code !== 0)) {
    throw new Error(`Four.meme create token failed: ${JSON.stringify(data)}`);
  }

  return {
    createArg: toHex(data.data.createArg),
    signature: toHex(data.data.signature),
    creationFeeWei: await calculateCreationFeeWei(preSale),
  };
}

export function extractTokenAddressFromReceipt(receipt: { logs: readonly { address: `0x${string}`; data: `0x${string}`; topics: readonly `0x${string}`[]; }[] }) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== TOKEN_MANAGER2_BSC.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: [TOKEN_CREATE_EVENT],
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === 'TokenCreate') {
        return decoded.args.token as `0x${string}`;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error('Unable to recover token address from Four.meme deployment receipt');
}
