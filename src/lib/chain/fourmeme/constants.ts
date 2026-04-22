import { parseAbi, parseAbiItem } from 'viem';

export const FOUR_MEME_API_BASE = 'https://four.meme/meme-api/v1';
export const BSC_RPC_URL =
  process.env.NEXT_PUBLIC_BSC_RPC_URL ?? 'https://bsc-dataseed.binance.org';
export const TOKEN_MANAGER2_BSC = '0x5c952063c7fc8610FFDB798152D69F0B9550762b' as const;
export const TOKEN_MANAGER_HELPER3_BSC = '0xF251F83e40a78868FcfA3FA4599Dad6494E46034' as const;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const TOKEN_MANAGER2_ABI = parseAbi([
  'function createToken(bytes args, bytes signature) payable',
  'function _launchFee() view returns (uint256)',
  'function _tradingFeeRate() view returns (uint256)',
]);

export const TOKEN_CREATE_EVENT = parseAbiItem(
  'event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)'
);

export const TAX_TOKEN_ABI = parseAbi([
  'function claimFee()',
  'function claimableFee(address account) view returns (uint256)',
  'function claimedFee(address account) view returns (uint256)',
  'function feeRate() view returns (uint256)',
  'function rateFounder() view returns (uint256)',
  'function rateHolder() view returns (uint256)',
  'function rateBurn() view returns (uint256)',
  'function rateLiquidity() view returns (uint256)',
  'function minDispatch() view returns (uint256)',
  'function minShare() view returns (uint256)',
  'function quote() view returns (address)',
  'function founder() view returns (address)',
  'function userInfo(address) view returns (uint256 share, uint256 rewardDebt, uint256 claimable, uint256 claimed)',
]);

export const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);
