"use client";

import { useState, useCallback } from "react";
import { useWallets, useSendTransaction } from "@privy-io/react-auth";
import { parseUnits, formatUnits, encodeFunctionData, parseAbi } from "viem";

// USDC on Base — 6 decimals
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const TOKEN_DECIMALS = 18; // proxy tokens are 18 decimals

// Fixed pricing: 1 message = $0.10 USDC
export const MESSAGE_PRICE_USD = 0.1;

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

interface SwapQuote {
  buyAmount: string;
  sellAmount: string;
  gas: string;
  gasPrice: string;
  allowanceTarget: string;
  transaction?: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
  totalNetworkFee: string;
}

export function useSwap() {
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWallet = useCallback(() => {
    const w = wallets.find((w) => w.walletClientType === "privy");
    return w ?? wallets[0] ?? null;
  }, [wallets]);

  /**
   * Get a price estimate (no transaction data, faster).
   * Buy mode:  amount = number of messages → converts to USDC (messages × $0.10), sells USDC for tokens
   * Sell mode: amount = number of messages (tokens) to sell → gets USDC back
   */
  const getPrice = useCallback(
    async (
      tokenAddress: string,
      amount: string,
      mode: "buy" | "sell",
    ): Promise<{ buyAmount: string; sellAmount: string } | null> => {
      setError(null);
      try {
        // Buy: convert messages to USDC cost (messages × $0.10)
        // Sell: amount is in tokens (18 decimals)
        let sellAmount: string;
        if (mode === "buy") {
          const usdcCost = parseFloat(amount) * MESSAGE_PRICE_USD;
          sellAmount = parseUnits(usdcCost.toFixed(USDC_DECIMALS), USDC_DECIMALS).toString();
        } else {
          sellAmount = parseUnits(amount, TOKEN_DECIMALS).toString();
        }

        const params = new URLSearchParams({
          type: "price",
          mode,
          tokenAddress,
          sellAmount,
        });

        const res = await fetch(`/api/swap?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to get price");
        }

        return await res.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get price");
        return null;
      }
    },
    [],
  );

  /**
   * Get a firm quote with transaction data ready to execute.
   * Buy: amount = messages, Sell: amount = messages (tokens)
   */
  const getQuote = useCallback(
    async (
      tokenAddress: string,
      amount: string,
      mode: "buy" | "sell",
    ): Promise<SwapQuote | null> => {
      setError(null);
      const wallet = getWallet();
      if (!wallet) {
        setError("No wallet connected");
        return null;
      }

      try {
        let sellAmount: string;
        if (mode === "buy") {
          const usdcCost = parseFloat(amount) * MESSAGE_PRICE_USD;
          sellAmount = parseUnits(usdcCost.toFixed(USDC_DECIMALS), USDC_DECIMALS).toString();
        } else {
          sellAmount = parseUnits(amount, TOKEN_DECIMALS).toString();
        }

        const params = new URLSearchParams({
          type: "quote",
          mode,
          tokenAddress,
          sellAmount,
          taker: wallet.address,
        });

        const res = await fetch(`/api/swap?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to get quote");
        }

        return await res.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get quote");
        return null;
      }
    },
    [getWallet],
  );

  /**
   * Execute a swap: get quote, approve if needed, send transaction.
   * Buy mode:  user specifies messages → internally converts to USDC
   * Sell mode: user specifies messages (tokens) → gets USDC
   */
  const executeSwap = useCallback(
    async (
      tokenAddress: string,
      amount: string,
      mode: "buy" | "sell",
    ): Promise<string | null> => {
      setLoading(true);
      setError(null);

      const wallet = getWallet();
      if (!wallet) {
        setError("No wallet connected");
        setLoading(false);
        return null;
      }

      try {
        const provider = await wallet.getEthereumProvider();

        // 1. Get quote (amount is messages for both modes, getQuote handles conversion)
        const quote = await getQuote(tokenAddress, amount, mode);
        if (!quote?.transaction) {
          throw new Error("No transaction data in quote");
        }

        // 2. Check and set allowance for the sell token
        // Buy mode: approve USDC spend; Sell mode: approve proxy token spend
        const sellTokenAddress = mode === "buy" ? USDC_ADDRESS : tokenAddress;
        let sellAmountWei: bigint;
        if (mode === "buy") {
          const usdcCost = parseFloat(amount) * MESSAGE_PRICE_USD;
          sellAmountWei = parseUnits(usdcCost.toFixed(USDC_DECIMALS), USDC_DECIMALS);
        } else {
          sellAmountWei = parseUnits(amount, TOKEN_DECIMALS);
        }
        const allowanceTarget = quote.allowanceTarget;

        // Check current allowance
        const allowanceData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [
            wallet.address as `0x${string}`,
            allowanceTarget as `0x${string}`,
          ],
        });

        const allowanceResult = await provider.request({
          method: "eth_call",
          params: [{ to: sellTokenAddress, data: allowanceData }, "latest"],
        });

        const currentAllowance = BigInt(allowanceResult as string);

        if (currentAllowance < sellAmountWei) {
          // Approve the allowance holder to spend tokens (gas sponsored)
          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [
              allowanceTarget as `0x${string}`,
              sellAmountWei * 2n, // Approve 2x for buffer
            ],
          });

          await sendTransaction(
            { to: sellTokenAddress, data: approveData },
            { sponsor: true, address: wallet.address },
          );

          // Wait a bit for approval to propagate
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // 3. Execute the swap (gas sponsored)
        const { hash } = await sendTransaction(
          {
            to: quote.transaction.to,
            data: quote.transaction.data,
            gasLimit: parseInt(quote.transaction.gas),
            value: quote.transaction.value
              ? BigInt(quote.transaction.value)
              : 0n,
          },
          { sponsor: true, address: wallet.address },
        );

        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Swap failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getWallet, getQuote, sendTransaction],
  );

  /**
   * Get USDC balance of the connected wallet.
   */
  const getUsdcBalance = useCallback(async (): Promise<string> => {
    const wallet = getWallet();
    if (!wallet) return "0";
    try {
      const provider = await wallet.getEthereumProvider();
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet.address as `0x${string}`],
      });
      const result = await provider.request({
        method: "eth_call",
        params: [{ to: USDC_ADDRESS, data }, "latest"],
      });
      return formatUnits(BigInt(result as string), USDC_DECIMALS);
    } catch {
      return "0";
    }
  }, [getWallet]);

  /**
   * Get proxy token balance of the connected wallet (18 decimals).
   */
  const getTokenBalance = useCallback(
    async (tokenAddress: string): Promise<string> => {
      const wallet = getWallet();
      if (!wallet) return "0";
      try {
        const provider = await wallet.getEthereumProvider();
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        });
        const result = await provider.request({
          method: "eth_call",
          params: [{ to: tokenAddress, data }, "latest"],
        });
        return formatUnits(BigInt(result as string), TOKEN_DECIMALS);
      } catch {
        return "0";
      }
    },
    [getWallet],
  );

  /**
   * Send USDC from the connected wallet to a recipient address.
   * Gas is sponsored via Privy.
   * Returns the tx hash on success, null on failure.
   */
  const sendUsdc = useCallback(
    async (recipient: string, amount: string): Promise<string | null> => {
      setLoading(true);
      setError(null);

      const wallet = getWallet();
      if (!wallet) {
        setError("No wallet connected");
        setLoading(false);
        return null;
      }

      try {
        const amountWei = parseUnits(
          parseFloat(amount).toFixed(USDC_DECIMALS),
          USDC_DECIMALS,
        );

        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipient as `0x${string}`, amountWei],
        });

        const { hash } = await sendTransaction(
          { to: USDC_ADDRESS, data },
          { sponsor: true, address: wallet.address },
        );

        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transfer failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getWallet, sendTransaction],
  );

  return {
    getPrice,
    getQuote,
    executeSwap,
    getUsdcBalance,
    getTokenBalance,
    sendUsdc,
    loading,
    error,
    walletAddress: getWallet()?.address ?? null,
  };
}
