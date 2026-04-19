import { FOUR_MEME_API_BASE } from './constants';

export async function generateNonce(accountAddress: string): Promise<string> {
  const res = await fetch(`${FOUR_MEME_API_BASE}/private/user/nonce/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress,
      verifyType: 'LOGIN',
      networkCode: 'BSC',
    }),
  });

  const data = await res.json();
  if (!res.ok || (data.code !== '0' && data.code !== 0)) {
    throw new Error(`Four.meme nonce failed: ${JSON.stringify(data)}`);
  }

  return String(data.data);
}

export async function loginWithSignature(address: string, signature: string): Promise<string> {
  const res = await fetch(`${FOUR_MEME_API_BASE}/private/user/login/dex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: 'WEB',
      langType: 'EN',
      loginIp: '',
      inviteCode: '',
      verifyInfo: {
        address,
        networkCode: 'BSC',
        signature,
        verifyType: 'LOGIN',
      },
      walletName: 'MetaMask',
    }),
  });

  const data = await res.json();
  if (!res.ok || (data.code !== '0' && data.code !== 0)) {
    throw new Error(`Four.meme login failed: ${JSON.stringify(data)}`);
  }

  return String(data.data);
}
