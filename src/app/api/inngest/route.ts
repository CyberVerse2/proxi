import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { pollMentions } from "@/inngest/poll-mentions";
import { autoRefresh } from "@/inngest/auto-refresh";
import { ingestProxy } from "@/inngest/ingest-proxy";
import { launchProxyToken } from "@/inngest/launch-proxy-token";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pollMentions, autoRefresh, ingestProxy, launchProxyToken],
});
