import { NextResponse } from "next/server";
import { privyServer } from "@/lib/auth/privy";
import { encodeFunctionData, parseUnits, parseAbi } from "viem";
import { USDC_ADDRESS, USDC_DECIMALS, BASE_CHAIN_ID } from "@/lib/config/constants";

const BASE_CAIP2 = `eip155:${BASE_CHAIN_ID}`;

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET!;

/**
 * Look up a Privy wallet by its on-chain address using the REST API.
 * Returns the internal wallet_id needed for RPC calls.
 */
async function getWalletIdByAddress(address: string): Promise<string | null> {
  const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString(
    "base64",
  );

  const res = await fetch(
    `https://api.privy.io/v1/wallets?address=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "privy-app-id": PRIVY_APP_ID,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    console.error("[withdraw] Failed to look up wallet:", await res.text());
    return null;
  }

  const data = await res.json();
  // The API returns { data: [{ id, address, chain_type, ... }] } or similar
  const wallets = data.data ?? data.wallets ?? data;
  if (Array.isArray(wallets) && wallets.length > 0) {
    return wallets[0].id;
  }

  return null;
}

/**
 * Send a transaction via Privy's server-side wallet RPC.
 */
async function sendTransactionViaPrivy(
  walletId: string,
  to: string,
  data: string,
): Promise<{ hash: string } | { error: string }> {
  const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString(
    "base64",
  );

  const res = await fetch(
    `https://api.privy.io/v1/wallets/${walletId}/rpc`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "privy-app-id": PRIVY_APP_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "eth_sendTransaction",
        caip2: BASE_CAIP2,
        chain_type: "ethereum",
        params: {
          transaction: {
            to,
            data,
            value: "0x0",
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("[withdraw] Privy RPC error:", errText);
    return { error: `Transaction failed: ${errText}` };
  }

  const result = await res.json();
  return { hash: result.data?.hash ?? result.hash };
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the user via Privy auth token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = await privyServer.verifyAuthToken(token);
    if (!authUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2. Parse the request body
    const { recipient, amount } = await request.json();

    if (!recipient || !amount) {
      return NextResponse.json(
        { error: "Missing recipient or amount" },
        { status: 400 },
      );
    }

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 },
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 },
      );
    }

    // 3. Get the user's wallet address from Privy
    const user = await privyServer.getUser(authUser.userId);
    const walletAccount = user.linkedAccounts.find(
      (a) => a.type === "wallet" && a.chainType === "ethereum",
    );

    if (!walletAccount || !("address" in walletAccount)) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 400 },
      );
    }

    const walletAddress = walletAccount.address;

    // 4. Look up the Privy wallet_id by address
    const walletId = await getWalletIdByAddress(walletAddress);
    if (!walletId) {
      return NextResponse.json(
        { error: "Could not find wallet in Privy" },
        { status: 500 },
      );
    }

    // 5. Encode the USDC transfer
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [
        recipient as `0x${string}`,
        parseUnits(parsedAmount.toFixed(USDC_DECIMALS), USDC_DECIMALS),
      ],
    });

    // 6. Send the transaction via Privy's server-side RPC
    const result = await sendTransactionViaPrivy(
      walletId,
      USDC_ADDRESS,
      transferData,
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ hash: result.hash });
  } catch (err) {
    console.error("[withdraw] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Withdrawal failed" },
      { status: 500 },
    );
  }
}
