/**
 * Keplr Integration Tests
 * Tests the Keplr wallet integration and gas sponsorship flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKeplr } from '../src/wallet/useKeplr';

// Mock window.keplr
const mockKeplr = {
  experimentalSuggestChain: vi.fn(),
  enable: vi.fn(),
  getOfflineSigner: vi.fn(),
};

describe('Keplr Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    global.window = { keplr: mockKeplr };
  });

  it('should detect when Keplr is not installed', () => {
    // @ts-ignore
    global.window = {};
    
    const { result } = renderHook(() => useKeplr('testnet'));
    
    expect(result.current.error).toBe('Keplr not found');
    expect(result.current.account).toBeNull();
  });

  it('should connect to Keplr when installed', async () => {
    const mockAccount = {
      address: 'cosmos1test123',
      algo: 'secp256k1',
      pubkey: new Uint8Array([1, 2, 3, 4]),
    };

    mockKeplr.getOfflineSigner.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue([mockAccount]),
    });

    const { result } = renderHook(() => useKeplr('testnet'));

    await waitFor(() => {
      expect(result.current.account).not.toBeNull();
    });

    expect(mockKeplr.experimentalSuggestChain).toHaveBeenCalled();
    expect(mockKeplr.enable).toHaveBeenCalled();
  });

  it('should use testnet configuration by default', async () => {
    mockKeplr.getOfflineSigner.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue([
        { address: 'cosmos1test', algo: 'secp256k1', pubkey: new Uint8Array([]) }
      ]),
    });

    renderHook(() => useKeplr('testnet'));

    await waitFor(() => {
      expect(mockKeplr.experimentalSuggestChain).toHaveBeenCalled();
    });

    const callArgs = mockKeplr.experimentalSuggestChain.mock.calls[0][0];
    expect(callArgs.chainId).toBe('theta-testnet-001');
  });

  it('should use mainnet configuration when specified', async () => {
    mockKeplr.getOfflineSigner.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue([
        { address: 'cosmos1main', algo: 'secp256k1', pubkey: new Uint8Array([]) }
      ]),
    });

    renderHook(() => useKeplr('mainnet'));

    await waitFor(() => {
      expect(mockKeplr.experimentalSuggestChain).toHaveBeenCalled();
    });

    const callArgs = mockKeplr.experimentalSuggestChain.mock.calls[0][0];
    expect(callArgs.chainId).toBe('cosmoshub-4');
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
  });

  it('should have valid testnet configuration', async () => {
    const { testnetChain } = await import('../src/blockchain/chains');
    
    expect(testnetChain.chainId).toBe('theta-testnet-001');
    expect(testnetChain.chainName).toBe('Cosmos Hub Testnet');
    expect(testnetChain.rpc).toBeTruthy();
    expect(testnetChain.rest).toBeTruthy();
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
    });

    const mockTxRaw = TxRaw.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      signatures: [new Uint8Array([7, 8, 9])],
    });

    const result = await sponsorAndBroadcast(mockTxRaw);
    
    expect(result.txhash).toBe('ABC123');
    expect(global.fetch).toHaveBeenCalled();
  });
});
