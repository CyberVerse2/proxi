import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { getUserByPrivyId, getProxyByCreatorId } from "@/lib/db/queries";

/**
 * POST /api/proxy/tokenize
 * Queue a token launch for the user's proxy.
 */
export async function POST(request: Request) {
  const { privyId, walletAddress } = await request.json();
  if (!privyId || !walletAddress) {
    return NextResponse.json(
      { error: "Missing privyId or walletAddress" },
      { status: 400 }
    );
  }

  const user = await getUserByPrivyId(privyId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const proxy = await getProxyByCreatorId(user.id);
  if (!proxy)
    return NextResponse.json({ error: "No proxy found" }, { status: 404 });

  if (proxy.tokenAddress) {
    return NextResponse.json(
      { error: "Token already deployed", tokenAddress: proxy.tokenAddress },
      { status: 409 }
    );
  }

  if (!proxy.voiceProfile || !proxy.coreBrain || !proxy.writingExamples) {
    return NextResponse.json(
      { error: "Proxy artifacts are not ready yet. Finish ingestion before launching the token." },
      { status: 409 }
    );
  }

  try {
    await inngest.send({
      name: "proxy/tokenize.requested",
      data: {
        proxyId: proxy.id,
        xHandle: proxy.xHandle,
        walletAddress,
      },
    });

    return NextResponse.json(
      { queued: true, proxyId: proxy.id, message: "Token launch queued" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[tokenize] Failed to queue token launch:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to queue token launch",
      },
      { status: 500 }
    );
  }
}
