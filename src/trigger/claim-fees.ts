/**
 * Trigger.dev scheduled task: claim-fees
 *
 * Runs every 6 hours and auto-claims accrued WETH LP fees from the
 * ClankerFeeLocker contract for every reward recipient (platform wallet
 * + all creator wallets with deployed tokens).
 *
 * The claim() function on the FeeLocker is callable by anyone, so our
 * deployer wallet pays gas but the WETH goes straight to each recipient.
 */

import { schedules, logger } from "@trigger.dev/sdk";
import {
  getAllRewardRecipients,
  getAvailableWethFees,
  claimWethFees,
} from "@/lib/chain/token";
import { formatEther } from "viem";

export const claimFees = schedules.task({
  id: "claim-fees",
  cron: "0 */1 * * *", // Every 1 hour
  machine: "micro",
  maxDuration: 300, // 5 minutes max

  queue: {
    concurrencyLimit: 1,
  },

  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },

  run: async () => {
    // 1. Gather all reward recipient wallets
    const recipients = await getAllRewardRecipients();
    logger.info(`Found ${recipients.length} reward recipient(s) to check`);

    if (recipients.length === 0) {
      return { claimed: 0, skipped: 0, reason: "no recipients" };
    }

    let claimed = 0;
    let skipped = 0;
    const results: {
      wallet: string;
      amountWei: string;
      amountEth: string;
      txHash: string;
    }[] = [];

    // 2. Check and claim fees for each recipient
    for (const wallet of recipients) {
      try {
        const available = await getAvailableWethFees(wallet);
        const ethAmount = formatEther(available);

        if (available < 100_000_000_000_000n) {
          // < 0.0001 WETH — not worth the gas
          logger.debug(`Skipping ${wallet}: ${ethAmount} WETH (below threshold)`);
          skipped++;
          continue;
        }

        logger.info(`Claiming ${ethAmount} WETH for ${wallet}`);

        const result = await claimWethFees(wallet);
        if (result) {
          claimed++;
          results.push({
            wallet,
            amountWei: result.amount.toString(),
            amountEth: formatEther(result.amount),
            txHash: result.txHash,
          });
          logger.info(`Claimed ${formatEther(result.amount)} WETH for ${wallet}`, {
            txHash: result.txHash,
          });
        }
      } catch (error) {
        logger.error(`Failed to claim fees for ${wallet}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next wallet — don't let one failure stop the rest
      }
    }

    logger.info(`Fee claim sweep complete: ${claimed} claimed, ${skipped} skipped`);

    return {
      claimed,
      skipped,
      total: recipients.length,
      results,
    };
  },
});
