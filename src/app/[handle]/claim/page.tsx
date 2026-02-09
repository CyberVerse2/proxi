import { notFound } from "next/navigation";
import { getProxyByHandle } from "@/lib/db/queries";
import { ClaimClient } from "./claim-client";

interface ClaimPageProps {
  params: Promise<{ handle: string }>;
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) notFound();

  return (
    <ClaimClient
      handle={proxy.xHandle}
      proxyId={proxy.id}
      displayName={proxy.displayName ?? proxy.xHandle}
      avatarUrl={proxy.avatarUrl ?? undefined}
      tokenAddress={proxy.tokenAddress ?? undefined}
      ticker={proxy.ticker ?? undefined}
    />
  );
}
