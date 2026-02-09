import { notFound } from "next/navigation";
import { getProxyByHandle } from "@/lib/db/queries";
import { AppShell } from "@/components/layout/app-shell";
import { ProxyDetail } from "./proxy-detail";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function ProxyDetailPage({ params }: Props) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) return notFound();

  return (
    <AppShell>
      <div className="pt-8">
        <ProxyDetail proxy={proxy} />
      </div>
    </AppShell>
  );
}
