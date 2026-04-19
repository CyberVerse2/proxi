import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProxyByHandleMock = vi.fn();
const claimCreatorEarningsMock = vi.fn();
const getAuthUserMock = vi.fn();
const getPrivyWalletAddressMock = vi.fn();
const dbSelectMock = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getProxyByHandle: getProxyByHandleMock,
}));

vi.mock('@/lib/chain/token', () => ({
  claimCreatorEarnings: claimCreatorEarningsMock,
}));

vi.mock('@/lib/auth/privy', () => ({
  getAuthUser: getAuthUserMock,
  getPrivyWalletAddress: getPrivyWalletAddressMock,
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: dbSelectMock,
  },
}));

describe('POST /api/claim-fees', () => {
  beforeEach(() => {
    vi.resetModules();
    getProxyByHandleMock.mockReset();
    claimCreatorEarningsMock.mockReset();
    getAuthUserMock.mockReset();
    getPrivyWalletAddressMock.mockReset();
    dbSelectMock.mockReset();
  });

  it('returns 401 when the request is not authenticated', async () => {
    getAuthUserMock.mockResolvedValue(null);

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/claim-fees', {
        method: 'POST',
        body: JSON.stringify({ handle: 'alice' }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns a no-op success response when no creator earnings are available', async () => {
    getAuthUserMock.mockResolvedValue({ userId: 'did:privy:creator' });
    getProxyByHandleMock.mockResolvedValue({
      id: 'proxy-1',
      tokenAddress: '0x3333333333333333333333333333333333333333',
      creatorId: null,
    });
    getPrivyWalletAddressMock.mockResolvedValue('0x4444444444444444444444444444444444444444');
    claimCreatorEarningsMock.mockResolvedValue(null);

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/claim-fees', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ handle: 'alice' }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      claimed: false,
      message: 'No creator earnings available to claim yet',
    });
  });

  it('returns the payout tx hash and formatted USDC amount for a successful claim', async () => {
    getAuthUserMock.mockResolvedValue({ userId: 'did:privy:creator' });
    getProxyByHandleMock.mockResolvedValue({
      id: 'proxy-1',
      tokenAddress: '0x3333333333333333333333333333333333333333',
      creatorId: null,
    });
    getPrivyWalletAddressMock.mockResolvedValue('0x4444444444444444444444444444444444444444');
    claimCreatorEarningsMock.mockResolvedValue({
      txHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
      creatorAmount: 1230000000000000000n,
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/claim-fees', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ handle: 'alice' }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      claimed: true,
      txHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
      amount: '1.23',
      asset: 'USDC',
    });
  });
});
