export interface SwapWallet {
  address: string;
  walletClientType?: string;
  getEthereumProvider: () => Promise<{
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  }>;
}

export function getPrimaryWallet(wallets: SwapWallet[]): SwapWallet | null {
  const privyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
  return privyWallet ?? wallets[0] ?? null;
}
