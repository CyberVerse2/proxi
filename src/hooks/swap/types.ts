export interface SwapQuote {
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

export type SwapMode = 'buy' | 'sell';
