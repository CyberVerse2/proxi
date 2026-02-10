/**
 * Inngest cron function: auto-refresh
 *
 * Periodically re-ingests recent posts for all live proxies
 * to keep their knowledge bases fresh.
 */

import { inngest } from "./client";
import { refreshAllLiveProxies } from "@/lib/jobs/auto-refresh";

export const autoRefresh = inngest.createFunction(
  {
    id: "auto-refresh-proxies",
    retries: 3,
  },
  { cron: "0 0 */3 * *" }, // Every 72 hours (at midnight every 3rd day)
  async () => {
    console.log("[refresh] Starting auto-refresh for all live proxies");

    try {
      await refreshAllLiveProxies();
      console.log("[refresh] Auto-refresh completed successfully");
      return { success: true };
    } catch (error) {
      console.error("[refresh] Auto-refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
);
