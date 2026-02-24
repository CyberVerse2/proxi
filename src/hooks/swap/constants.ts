import { parseAbi } from 'viem';

export const TOKEN_DECIMALS = 18; // proxy tokens are 18 decimals

export const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
]);
