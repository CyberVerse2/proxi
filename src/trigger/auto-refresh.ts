/**
 * Trigger.dev scheduled task: auto-refresh
 *
 * Periodically re-ingests recent posts for all live proxies
 * to keep their knowledge bases fresh.
 */

import { schedules, logger } from "@trigger.dev/sdk";
import { refreshAllLiveProxies } from "@/lib/jobs/auto-refresh";

export const autoRefreshTask = schedules.task({
  id: "auto-refresh-proxies",

  // Run every 72 hours (at midnight every 3rd day)
  cron: "0 0 */3 * *",
  machine: "micro",

  maxDuration: 1800, // 30 minutes max

  run: async () => {
    logger.info("Starting auto-refresh for all live proxies");

    try {
      await refreshAllLiveProxies();
      logger.info("Auto-refresh completed successfully");
      return { success: true };
    } catch (error) {
      logger.error("Auto-refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
