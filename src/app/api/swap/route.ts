import { NextResponse } from "next/server";

const ZX_API_KEY = process.env["0X_API_KEY"] ?? "";
const BASE_CHAIN_ID = 8453;
// USDC on Base (6 decimals)
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Affiliate fee config — 1% fee sent to the platform wallet in the sell token
const SWAP_FEE_RECIPIENT =
  process.env.PLATFORM_WALLET_ADDRESS ??
  "0x85812b10E4789F8BbCF34fC818809480DfA47b64";
const SWAP_FEE_BPS = "100"; // 1% (100 basis points)

/**
 * GET /api/swap?type=price|quote&mode=buy|sell&tokenAddress=0x...&sellAmount=123&taker=0x...
 *
 * Proxies to 0x Swap API v2 (Allowance Holder) keeping the API key server-side.
 *
 * Buy mode:  sell USDC → buy proxy token
 * Sell mode: sell proxy token → buy USDC
 *
 * Affiliate fee: 1% of the sell token is collected and sent to the platform wallet.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "price"; // "price" or "quote"
  const mode = searchParams.get("mode") ?? "buy"; // "buy" or "sell"
  const tokenAddress = searchParams.get("tokenAddress");
  const sellAmount = searchParams.get("sellAmount");
  const taker = searchParams.get("taker");

  if (!tokenAddress || !sellAmount) {
    return NextResponse.json(
      { error: "Missing tokenAddress or sellAmount" },
      { status: 400 },
    );
  }

  if (!ZX_API_KEY) {
    return NextResponse.json(
      { error: "0x API key not configured" },
      { status: 500 },
    );
  }

  // Build 0x request
  const isBuy = mode === "buy";
  const sellToken = isBuy ? USDC : tokenAddress;
  const buyToken = isBuy ? tokenAddress : USDC;

  const params = new URLSearchParams({
    chainId: String(BASE_CHAIN_ID),
    sellToken,
    buyToken,
    sellAmount,
    slippageBps: "100", // 1% slippage
    // Affiliate fee — collect in the sell token and send to platform wallet
    swapFeeRecipient: SWAP_FEE_RECIPIENT,
    swapFeeBps: SWAP_FEE_BPS,
    swapFeeToken: sellToken,
  });

  // For quote, taker is required
  if (type === "quote" && taker) {
    params.set("taker", taker);
  }

  const endpoint =
    type === "quote"
      ? "https://api.0x.org/swap/allowance-holder/quote"
      : "https://api.0x.org/swap/allowance-holder/price";

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        "0x-api-key": ZX_API_KEY,
        "0x-version": "v2",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.reason ?? "0x API error", details: data },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[swap] 0x API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch swap quote" },
      { status: 500 },
    );
  }
}
