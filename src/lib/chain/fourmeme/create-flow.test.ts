import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signMessageMock = vi.fn();
const generateNonceMock = vi.fn();
const loginWithSignatureMock = vi.fn();
const readContractMock = vi.fn();
const createPublicClientMock = vi.fn(() => ({
  readContract: readContractMock,
}));

vi.mock('./client', () => ({
  getDeployerAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    signMessage: signMessageMock,
  }),
  PROXI_FOUNDER_WALLET: '0x2222222222222222222222222222222222222222',
}));

vi.mock('./auth', () => ({
  generateNonce: generateNonceMock,
  loginWithSignature: loginWithSignatureMock,
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: createPublicClientMock,
  };
});

describe('createFourMemeTokenPayload', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    signMessageMock.mockResolvedValue('0xsigned-message');
    generateNonceMock.mockResolvedValue('nonce-123');
    loginWithSignatureMock.mockResolvedValue('access-token');
    readContractMock.mockReset();
    readContractMock.mockResolvedValueOnce(100n).mockResolvedValueOnce(50n);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a Four.meme tax-token create payload around BSC USDC', async () => {
    fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === 'https://example.com/avatar.png') {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }

      if (url.includes('/private/token/upload')) {
        expect(init?.method).toBe('POST');
        expect((init?.headers as Record<string, string>)['meme-web-access']).toBe('access-token');
        return Response.json({ code: '0', data: 'https://cdn.four.meme/token.png' });
      }

      if (url.includes('/public/config')) {
        return Response.json({
          code: '0',
          data: [
            {
              symbol: 'USDC',
              symbolAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
              totalAmount: 1234567890,
              totalBAmount: 42,
              saleRate: 0.75,
              status: 'PUBLISH',
            },
          ],
        });
      }

      if (url.includes('/private/token/create')) {
        const body = JSON.parse(String(init?.body));
        expect(body.name).toBe('Proxy');
        expect(body.shortName).toBe('PRX');
        expect(body.desc).toBe('Test proxy');
        expect(body.symbol).toBe('USDC');
        expect(body.raisedToken.symbolAddress).toBe('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');
        expect(body.totalSupply).toBe(1234567890);
        expect(body.raisedAmount).toBe(42);
        expect(body.saleRate).toBe(0.75);
        expect(body.tokenTaxInfo).toEqual({
          feeRate: 1,
          burnRate: 0,
          divideRate: 0,
          liquidityRate: 0,
          recipientRate: 100,
          recipientAddress: '0x2222222222222222222222222222222222222222',
          minSharing: 100000,
        });

        return Response.json({
          code: '0',
          data: {
            createArg: '0x1234',
            signature: '0xabcd',
          },
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const { createFourMemeTokenPayload } = await import('./create');
    const result = await createFourMemeTokenPayload({
      name: 'Proxy',
      symbol: 'PRX',
      description: 'Test proxy',
      imageUrl: 'https://example.com/avatar.png',
    });

    expect(generateNonceMock).toHaveBeenCalledWith('0x1111111111111111111111111111111111111111');
    expect(signMessageMock).toHaveBeenCalledWith({ message: 'You are sign in Meme nonce-123' });
    expect(loginWithSignatureMock).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      '0xsigned-message'
    );
    expect(result).toEqual({
      createArg: '0x1234',
      signature: '0xabcd',
      creationFeeWei: 100n,
    });
  });
});
