import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { pollMentions } from "@/inngest/poll-mentions";
import { claimFees } from "@/inngest/claim-fees";
import { autoRefresh } from "@/inngest/auto-refresh";
import { ingestProxy } from "@/inngest/ingest-proxy";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pollMentions, claimFees, autoRefresh, ingestProxy],
});
