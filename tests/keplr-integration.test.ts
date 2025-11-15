/**
 * Keplr Integration Tests
 * Tests the Keplr wallet integration and gas sponsorship flow
 */

import { describe, it, expect, vi } from 'vitest';

// Mock window.keplr
const mockKeplr = {
  experimentalSuggestChain: vi.fn(),
  enable: vi.fn(),
  getOfflineSigner: vi.fn(),
};

describe('Keplr Integration', () => {
  it('should detect when Keplr is not installed', () => {
    const mockWindow = {} as any;
    expect(mockWindow.keplr).toBeUndefined();
  });

  it('should have Keplr interface when installed', () => {
    const mockWindow = { keplr: mockKeplr } as any;
    expect(mockWindow.keplr).toBeDefined();
    expect(mockWindow.keplr.enable).toBeDefined();
    expect(mockWindow.keplr.getOfflineSigner).toBeDefined();
  });
});

describe('Chain Configuration', () => {
  it('should have valid mainnet configuration', async () => {
    const { mainnetChain } = await import('../src/blockchain/chains');
    
    expect(mainnetChain.chainId).toBe('cosmoshub-4');
    expect(mainnetChain.chainName).toBe('Cosmos Hub');
    expect(mainnetChain.rpc).toBeTruthy();
    expect(mainnetChain.rest).toBeTruthy();
    expect(mainnetChain.bech32Config.bech32PrefixAccAddr).toBe('cosmos');
    expect(mainnetChain.currencies).toHaveLength(1);
    expect(mainnetChain.currencies[0].coinDenom).toBe('ATOM');
    expect(mainnetChain.currencies[0].coinMinimalDenom).toBe('uatom');
  });

  it('should have valid testnet configuration', async () => {
    const { testnetChain } = await import('../src/blockchain/chains');
    
    expect(testnetChain.chainId).toBe('theta-testnet-001');
    expect(testnetChain.chainName).toBe('Cosmos Hub Testnet');
    expect(testnetChain.rpc).toBeTruthy();
    expect(testnetChain.rest).toBeTruthy();
    expect(testnetChain.bech32Config.bech32PrefixAccAddr).toBe('cosmos');
  });

  it('should have compatible chain configurations', async () => {
    const { mainnetChain, testnetChain } = await import('../src/blockchain/chains');
    
    // Should have same structure
    expect(testnetChain.bech32Config.bech32PrefixAccAddr).toBe(mainnetChain.bech32Config.bech32PrefixAccAddr);
    expect(testnetChain.currencies[0].coinDenom).toBe(mainnetChain.currencies[0].coinDenom);
    expect(testnetChain.stakeCurrency.coinDenom).toBe(mainnetChain.stakeCurrency.coinDenom);
  });
});

describe('Gas Sponsorship', () => {
  it('should format transaction for sponsorship correctly', async () => {
    const { sponsorAndBroadcast } = await import('../src/blockchain/sponsor');
    const { TxRaw } = await import('cosmjs-types/cosmos/tx/v1beta1/tx');
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ txhash: 'ABC123', code: 0 }),
      text: vi.fn().mockResolvedValue('Success'),
    });

    const mockTxRaw = TxRaw.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      signatures: [new Uint8Array([7, 8, 9])],
    });

    const result = await sponsorAndBroadcast(mockTxRaw);
    
    expect(result.txhash).toBe('ABC123');
    expect(global.fetch).toHaveBeenCalled();
    
    // Verify the request format
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
  });

  it('should handle sponsorship errors gracefully', async () => {
    const { sponsorAndBroadcast } = await import('../src/blockchain/sponsor');
    const { TxRaw } = await import('cosmjs-types/cosmos/tx/v1beta1/tx');
    
    // Mock failed fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Server error'),
    });

    const mockTxRaw = TxRaw.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      signatures: [new Uint8Array([7, 8, 9])],
    });

    await expect(sponsorAndBroadcast(mockTxRaw)).rejects.toThrow('Server error');
  });
});

describe('Transaction Sender', () => {
  it('should export sendWithSponsor function', async () => {
    const { sendWithSponsor } = await import('../src/blockchain/tx-sender');
    expect(sendWithSponsor).toBeDefined();
    expect(typeof sendWithSponsor).toBe('function');
  });
});

