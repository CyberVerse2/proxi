/**
 * Inngest cron function: claim-fees
 *
 * Runs every hour and auto-claims accrued WETH LP fees from the
 * ClankerFeeLocker contract for every reward recipient (platform wallet
 * + all creator wallets with deployed tokens).
 *
 * The claim() function on the FeeLocker is callable by anyone, so our
 * deployer wallet pays gas but the WETH goes straight to each recipient.
 */

import { inngest } from "./client";
import {
  getAllRewardRecipients,
  getAvailableWethFees,
  claimWethFees,
} from "@/lib/chain/token";
import { formatEther } from "viem";

export const claimFees = inngest.createFunction(
  {
    id: "claim-fees",
    concurrency: [{ limit: 1 }],
    retries: 3,
  },
  { cron: "0 */1 * * *" },
  async () => {
    // 1. Gather all reward recipient wallets
    const recipients = await getAllRewardRecipients();
    console.log(`[fees] Found ${recipients.length} reward recipient(s) to check`);

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
          skipped++;
          continue;
        }

        console.log(`[fees] Claiming ${ethAmount} WETH for ${wallet}`);

        const result = await claimWethFees(wallet);
        if (result) {
          claimed++;
          results.push({
            wallet,
            amountWei: result.amount.toString(),
            amountEth: formatEther(result.amount),
            txHash: result.txHash,
          });
          console.log(`[fees] Claimed ${formatEther(result.amount)} WETH for ${wallet}`, {
            txHash: result.txHash,
          });
        }
      } catch (error) {
        console.error(`[fees] Failed to claim fees for ${wallet}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue to next wallet — don't let one failure stop the rest
      }
    }

    console.log(`[fees] Fee claim sweep complete: ${claimed} claimed, ${skipped} skipped`);

    return {
      claimed,
      skipped,
      total: recipients.length,
      results,
    };
  },
);
