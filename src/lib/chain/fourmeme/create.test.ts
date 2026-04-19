import { describe, expect, it } from 'vitest';
import { encodeAbiParameters, toEventSelector } from 'viem';
import { pickUsdcRaisedToken, extractTokenAddressFromReceipt } from './create';
import { TOKEN_CREATE_EVENT, TOKEN_MANAGER2_BSC } from './constants';
import { USDC_ADDRESS } from '@/lib/config/constants';

describe('pickUsdcRaisedToken', () => {
  it('prefers published USDC configs by token address', () => {
    const selected = pickUsdcRaisedToken([
      {
        symbol: 'USDC',
        symbolAddress: '0x1111111111111111111111111111111111111111',
        status: 'DRAFT',
      },
      {
        symbol: 'USDC',
        symbolAddress: USDC_ADDRESS,
        status: 'PUBLISH',
      },
    ]);

    expect(selected.symbolAddress).toBe(USDC_ADDRESS);
  });

  it('falls back to matching USDC by symbol when address is missing', () => {
    const selected = pickUsdcRaisedToken([
      {
        symbol: 'WBNB',
        symbolAddress: '0x2222222222222222222222222222222222222222',
      },
      {
        symbol: 'USDC',
        totalAmount: 1_000_000_000,
      },
    ]);

    expect(selected.symbol).toBe('USDC');
  });

  it('throws when USDC is unavailable', () => {
    expect(() =>
      pickUsdcRaisedToken([
        {
          symbol: 'WBNB',
          symbolAddress: '0x3333333333333333333333333333333333333333',
          status: 'PUBLISH',
        },
      ])
    ).toThrow('USDC raised token');
  });
});

describe('extractTokenAddressFromReceipt', () => {
  it('returns the token address from the TokenCreate event', () => {
    const tokenAddress = '0x4444444444444444444444444444444444444444';
    const creator = '0x5555555555555555555555555555555555555555';
    const topics = [toEventSelector(TOKEN_CREATE_EVENT)];
    const data = encodeAbiParameters(
      [
        { type: 'address', name: 'creator' },
        { type: 'address', name: 'token' },
        { type: 'uint256', name: 'requestId' },
        { type: 'string', name: 'name' },
        { type: 'string', name: 'symbol' },
        { type: 'uint256', name: 'totalSupply' },
        { type: 'uint256', name: 'launchTime' },
        { type: 'uint256', name: 'launchFee' },
      ],
      [
        creator,
        tokenAddress,
        7n,
        'Proxy Token',
        'PROXY',
        1_000_000_000n,
        1_700_000_000n,
        1_000_000_000_000_000n,
      ]
    );

    const parsed = extractTokenAddressFromReceipt({
      logs: [
        {
          address: '0x6666666666666666666666666666666666666666',
          data: '0x',
          topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'],
        },
        {
          address: TOKEN_MANAGER2_BSC,
          data,
          topics,
        },
      ],
    });

    expect(parsed).toBe(tokenAddress);
  });

  it('throws when the receipt does not contain the creation event', () => {
    expect(() =>
      extractTokenAddressFromReceipt({
        logs: [],
      })
    ).toThrow('Unable to recover token address');
  });
});
