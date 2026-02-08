import { getLiveProxies } from "@/lib/db/queries";
import { LandingPageClient } from "./landing-client";

export default async function LandingPage() {
  const proxies = await getLiveProxies(20);
  return <LandingPageClient proxies={proxies} />;
}
