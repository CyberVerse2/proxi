import { PrivyClient } from '@privy-io/server-auth';
import { BASE_CHAIN_ID } from '@/lib/config/constants';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET!;
const BASE_CAIP2 = `eip155:${BASE_CHAIN_ID}`;

export const privyServer = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

export async function getAuthUser(authToken: string | undefined) {
  if (!authToken) return null;
  try {
    return await privyServer.verifyAuthToken(authToken);
  } catch {
    return null;
  }
}

/**
 * Fetch a user's embedded Ethereum wallet address from Privy by DID.
 * Returns null if the user doesn't have one.
 */
export async function getPrivyWalletAddress(privyDid: string): Promise<string | null> {
  try {
    const user = await privyServer.getUser(privyDid);
    const wallet = user.linkedAccounts.find(
      (a) => a.type === 'wallet' && a.chainType === 'ethereum'
    );
    return wallet && 'address' in wallet ? wallet.address : null;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Server-side wallet creation for the "clone me" flow       */
/* ────────────────────────────────────────────────────────── */

interface CreateUserResult {
  privyId: string;
  walletAddress: string;
}

/**
 * Create a Privy user with a linked Twitter account and an embedded
 * Ethereum wallet -- all server-side, no user interaction required.
 *
 * If the Twitter account is already linked to an existing Privy user
 * (e.g. they signed up before tweeting), we look up that user and
 * return their existing wallet instead.
 *
 * @param twitterUsername  The user's X handle (without @)
 * @param twitterSubject   The user's numeric X/Twitter user ID
 */
export async function createUserWithWallet(
  twitterUsername: string,
  twitterSubject: string
): Promise<CreateUserResult> {
  try {
    // Attempt to create a brand-new Privy user with Twitter linked + embedded wallet
    const user = await privyServer.importUser({
      linkedAccounts: [
        {
          type: 'twitter_oauth',
          subject: twitterSubject,
          username: twitterUsername,
          name: twitterUsername
        }
      ],
      createEthereumWallet: true
    });

    // Find the embedded wallet from the returned user object
    const wallet = user.linkedAccounts.find(
      (a) => a.type === 'wallet' && a.chainType === 'ethereum'
    );

    if (!wallet || !('address' in wallet)) {
      throw new Error(`Privy importUser succeeded but no wallet found for @${twitterUsername}`);
    }

    return {
      privyId: user.id,
      walletAddress: wallet.address
    };
  } catch (error) {
    // If the Twitter account is already linked, look up the existing user
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes('already linked') ||
      message.includes('already exists') ||
      message.includes('conflict')
    ) {
      console.log(`[privy] Twitter @${twitterUsername} already linked, looking up existing user`);
      return findExistingUserByTwitter(twitterUsername);
    }

    throw error;
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Server-side wallet RPC helpers (Privy REST API)          */
/* ────────────────────────────────────────────────────────── */

/**
 * Look up a Privy wallet by its on-chain address using the REST API.
 * Returns the internal wallet_id needed for RPC calls.
 */
export async function getWalletIdByAddress(address: string): Promise<string | null> {
  const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');

  const res = await fetch(
    `https://api.privy.io/v1/wallets?address=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'privy-app-id': PRIVY_APP_ID,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!res.ok) {
    console.error('[privy] Failed to look up wallet:', await res.text());
    return null;
  }

  const data = await res.json();
  const wallets = data.data ?? data.wallets ?? data;
  if (Array.isArray(wallets) && wallets.length > 0) {
    return wallets[0].id;
  }

  return null;
}

/**
 * Send a transaction via Privy's server-side wallet RPC.
 * Returns the tx hash on success, or an error string on failure.
 */
export async function sendTransactionViaPrivy(
  walletId: string,
  to: string,
  data: string
): Promise<{ hash: string } | { error: string }> {
  const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');

  const res = await fetch(`https://api.privy.io/v1/wallets/${walletId}/rpc`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'privy-app-id': PRIVY_APP_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'eth_sendTransaction',
      caip2: BASE_CAIP2,
      chain_type: 'ethereum',
      params: {
        transaction: {
          to,
          data,
          value: '0x0'
        }
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[privy] Privy RPC error:', errText);
    return { error: `Transaction failed: ${errText}` };
  }

  const result = await res.json();
  return { hash: result.data?.hash ?? result.hash };
}

/* ────────────────────────────────────────────────────────── */
/*  Internal helpers                                          */
/* ────────────────────────────────────────────────────────── */

/**
 * Look up an existing Privy user by their Twitter username.
 * Falls back to searching by Twitter subject if needed.
 */
async function findExistingUserByTwitter(twitterUsername: string): Promise<CreateUserResult> {
  // Privy server SDK doesn't have a direct "get by twitter username" --
  // we search by twitter subject. But since we might not have the subject
  // in this fallback path, we use getUserByTwitterUsername.
  try {
    const user = await privyServer.getUserByTwitterUsername(twitterUsername);

    if (!user) {
      throw new Error(`Could not find existing Privy user for @${twitterUsername}`);
    }

    // Find their wallet
    const wallet = user.linkedAccounts.find(
      (a) => a.type === 'wallet' && a.chainType === 'ethereum'
    );

    if (!wallet || !('address' in wallet)) {
      // User exists but has no wallet -- create one
      const updated = await privyServer.createWallets({
        userId: user.id,
        createEthereumWallet: true
      });

      const newWallet = updated.linkedAccounts.find(
        (a) => a.type === 'wallet' && a.chainType === 'ethereum'
      );

      if (!newWallet || !('address' in newWallet)) {
        throw new Error(`Failed to create wallet for existing Privy user @${twitterUsername}`);
      }

      return {
        privyId: updated.id,
        walletAddress: newWallet.address
      };
    }

    return {
      privyId: user.id,
      walletAddress: wallet.address
    };
  } catch (err) {
    throw new Error(
      `Failed to find existing Privy user for @${twitterUsername}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
