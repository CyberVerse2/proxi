import { describe, expect, it } from 'vitest';
import { calculateCreatorShareBreakdown } from './fees';

describe('calculateCreatorShareBreakdown', () => {
  it('computes the 60/40 creator-share math from claimed and unclaimed fees', () => {
    const result = calculateCreatorShareBreakdown({
      claimed: 1_000n,
      unclaimed: 500n,
      creatorSharePaidOut: 200n,
    });

    expect(result.creatorShareClaimed).toBe(600n);
    expect(result.creatorShareUnclaimed).toBe(300n);
    expect(result.creatorShareTotal).toBe(900n);
    expect(result.creatorShareAvailable).toBe(700n);
  });

  it('never returns a negative available creator balance', () => {
    const result = calculateCreatorShareBreakdown({
      claimed: 100n,
      unclaimed: 0n,
      creatorSharePaidOut: 1_000n,
    });

    expect(result.creatorShareClaimed).toBe(60n);
    expect(result.creatorShareTotal).toBe(60n);
    expect(result.creatorShareAvailable).toBe(0n);
  });

  it('keeps bigint rounding behavior stable for odd token amounts', () => {
    const result = calculateCreatorShareBreakdown({
      claimed: 1n,
      unclaimed: 2n,
      creatorSharePaidOut: 0n,
    });

    expect(result.creatorShareClaimed).toBe(0n);
    expect(result.creatorShareUnclaimed).toBe(1n);
    expect(result.creatorShareTotal).toBe(1n);
    expect(result.creatorShareAvailable).toBe(1n);
  });
});
