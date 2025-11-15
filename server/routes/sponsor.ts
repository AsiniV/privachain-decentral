/**
 * Gas Sponsorship Routes
 * Handles zero-fee user transactions by adding gas fees on the backend
 */

import { Router } from 'express';
import { SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { GasPrice } from '@cosmjs/stargate';

const router = Router();

/**
 * POST /api/sponsor
 * Accepts a user-signed zero-fee transaction and adds gas fees before broadcasting
 */
router.post('/sponsor', async (req, res) => {
  try {
    const { tx_bytes, chain_id } = req.body;

    if (!tx_bytes || !chain_id) {
      return res.status(400).json({ error: 'Missing tx_bytes or chain_id' });
    }

    // Get developer mnemonic from environment
    const mnemonic = process.env.DEVELOPER_MNEMONIC;
    if (!mnemonic) {
      return res.status(500).json({ error: 'Server not configured with developer mnemonic' });
    }

    // Decode the user's transaction
    const txRaw = TxRaw.decode(Buffer.from(tx_bytes, 'base64'));

    // Get RPC endpoint based on chain_id
    let rpcEndpoint: string;
    if (chain_id === 'cosmoshub-4') {
      rpcEndpoint = 'https://rpc-cosmoshub.polkachu.com';
    } else if (chain_id === 'theta-testnet-001') {
      rpcEndpoint = 'https://rpc.sentry-01.theta-testnet.polypore.xyz';
    } else {
      return res.status(400).json({ error: `Unsupported chain_id: ${chain_id}` });
    }

    // Connect with developer wallet to sponsor gas
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'cosmos' });
    const client = await SigningStargateClient.connectWithSigner(
      rpcEndpoint,
      wallet,
      { gasPrice: GasPrice.fromString('0.025uatom') }
    );

    // In a real implementation, we would:
    // 1. Parse the user's transaction
    // 2. Add appropriate gas fees
    // 3. Re-sign with developer wallet as fee payer
    // For now, we'll broadcast the transaction as-is
    // This is a simplified version - in production you'd need to properly handle fee addition

    const txBytes = TxRaw.encode(txRaw).finish();
    const result = await client.broadcastTx(txBytes);

    res.json({
      txhash: result.transactionHash,
      code: result.code,
      logs: result.rawLog
    });

  } catch (error) {
    console.error('Sponsor endpoint error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error during transaction sponsorship'
    });
  }
});

export default router;
