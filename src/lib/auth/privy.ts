import { PrivyClient } from "@privy-io/server-auth";

export const privyServer = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function getAuthUser(authToken: string | undefined) {
  if (!authToken) return null;
  try {
    return await privyServer.verifyAuthToken(authToken);
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
  twitterSubject: string,
): Promise<CreateUserResult> {
  try {
    // Attempt to create a brand-new Privy user with Twitter linked + embedded wallet
    const user = await privyServer.importUser({
      linkedAccounts: [
        {
          type: "twitter_oauth",
          subject: twitterSubject,
          username: twitterUsername,
          name: twitterUsername,
        },
      ],
      createEthereumWallet: true,
    });

    // Find the embedded wallet from the returned user object
    const wallet = user.linkedAccounts.find(
      (a) => a.type === "wallet" && a.chainType === "ethereum"
    );

    if (!wallet || !("address" in wallet)) {
      throw new Error(
        `Privy importUser succeeded but no wallet found for @${twitterUsername}`
      );
    }

    return {
      privyId: user.id,
      walletAddress: wallet.address,
    };
  } catch (error) {
    // If the Twitter account is already linked, look up the existing user
    const message =
      error instanceof Error ? error.message : String(error);

    if (
      message.includes("already linked") ||
      message.includes("already exists") ||
      message.includes("conflict")
    ) {
      console.log(
        `[privy] Twitter @${twitterUsername} already linked, looking up existing user`
      );
      return findExistingUserByTwitter(twitterUsername);
    }

    throw error;
  }
}

/**
 * Look up an existing Privy user by their Twitter username.
 * Falls back to searching by Twitter subject if needed.
 */
async function findExistingUserByTwitter(
  twitterUsername: string,
): Promise<CreateUserResult> {
  // Privy server SDK doesn't have a direct "get by twitter username" --
  // we search by twitter subject. But since we might not have the subject
  // in this fallback path, we use getUserByTwitterUsername.
  try {
    const user = await privyServer.getUserByTwitterUsername(twitterUsername);

    if (!user) {
      throw new Error(
        `Could not find existing Privy user for @${twitterUsername}`
      );
    }

    // Find their wallet
    const wallet = user.linkedAccounts.find(
      (a) => a.type === "wallet" && a.chainType === "ethereum"
    );

    if (!wallet || !("address" in wallet)) {
      // User exists but has no wallet -- create one
      const updated = await privyServer.createWallets({
        userId: user.id,
        createEthereumWallet: true,
      });

      const newWallet = updated.linkedAccounts.find(
        (a) => a.type === "wallet" && a.chainType === "ethereum"
      );

      if (!newWallet || !("address" in newWallet)) {
        throw new Error(
          `Failed to create wallet for existing Privy user @${twitterUsername}`
        );
      }

      return {
        privyId: updated.id,
        walletAddress: newWallet.address,
      };
    }

    return {
      privyId: user.id,
      walletAddress: wallet.address,
    };
  } catch (err) {
    throw new Error(
      `Failed to find existing Privy user for @${twitterUsername}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
