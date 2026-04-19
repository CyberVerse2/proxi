import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";

export const bscClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.binance.org"),
});

export { bsc };
