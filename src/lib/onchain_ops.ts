// onchain_ops.ts - On-Chain Operations via Keplr
//
// Provides functions for storing encrypted CIDs and retracting messages
// on the Cosmos blockchain using Keplr wallet signatures

import { connectKeplr, signAndBroadcastKeplr, isKeplrInstalled } from './keplr_connect'

// Contract address from environment or configuration
// In a real deployment, this would be set via environment variables
const CONTRACT_ADDR = import.meta.env.VITE_CONTRACT_ADDR || 'cosmos1...'; // Placeholder for actual contract

/**
 * Store an encrypted CID (chat message) on the blockchain
 * @param cid - The IPFS CID of the encrypted message
 * @returns Promise<string> - Transaction hash
 */
export async function storeCID(cid: string): Promise<string> {
  if (!isKeplrInstalled()) {
    throw new Error("Keplr extension not found. Please install Keplr to store messages on-chain.")
  }

  try {
    // Get current address
    const senderAddress = await connectKeplr()
    
    // Create the message for storing metadata
    const msg = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: {
        sender: senderAddress,
        contract: CONTRACT_ADDR,
        msg: Buffer.from(JSON.stringify({ 
          store_metadata: { 
            cid: cid,
            timestamp: Date.now(),
            sender: senderAddress
          } 
        })),
        funds: []
      }
    }

    // Sign and broadcast the transaction
    const txHash = await signAndBroadcastKeplr([msg], `Store CID: ${cid.slice(0, 12)}...`)
    
    console.log(`✅ CID stored on-chain. TX: ${txHash}`)
    return txHash
    
  } catch (error) {
    console.error('Failed to store CID on-chain:', error)
    throw new Error(`Failed to store message on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Retract a message with ZK-Proof (delete everywhere)
 * @param nullifier - Zero-knowledge nullifier for the message
 * @param proof - ZK proof for authorized retraction
 * @returns Promise<{ transactionHash: string }> - Transaction result
 */
export async function retractCID(nullifier: string, proof: string): Promise<{ transactionHash: string }> {
  if (!isKeplrInstalled()) {
    throw new Error("Keplr extension not found. Please install Keplr to retract messages.")
  }

  try {
    // Get current address
    const senderAddress = await connectKeplr()
    
    // Create the message for retracting with ZK proof
    const msg = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: {
        sender: senderAddress,
        contract: CONTRACT_ADDR,
        msg: Buffer.from(JSON.stringify({ 
          retract: { 
            nullifier: nullifier, 
            proof: proof,
            timestamp: Date.now()
          } 
        })),
        funds: []
      }
    }

    // Sign and broadcast the transaction
    const txHash = await signAndBroadcastKeplr([msg], `Retract message: ${nullifier.slice(0, 12)}...`)
    
    console.log(`✅ Message retracted on-chain. TX: ${txHash}`)
    return { transactionHash: txHash }
    
  } catch (error) {
    console.error('Failed to retract message on-chain:', error)
    throw new Error(`Failed to retract message on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Query stored metadata from the blockchain
 * @param cid - The CID to query
 * @returns Promise<any> - The stored metadata or null if not found
 */
export async function queryCID(cid: string): Promise<any> {
  // This would use a read-only client to query the contract
  // For now, return a placeholder implementation
  console.log(`Querying CID: ${cid}`)
  
  try {
    // In a real implementation, this would query the contract state
    // const result = await cosmWasmClient.queryContractSmart(CONTRACT_ADDR, {
    //   get_metadata: { cid: cid }
    // })
    // return result
    
    return null // Placeholder
  } catch (error) {
    console.error('Failed to query CID:', error)
    return null
  }
}

/**
 * Get the current contract address being used
 * @returns string - The contract address
 */
export function getContractAddress(): string {
  return CONTRACT_ADDR
}

/**
 * Check if the contract address is properly configured
 * @returns boolean - True if contract address is set
 */
export function isContractConfigured(): boolean {
  return CONTRACT_ADDR !== 'cosmos1...' && CONTRACT_ADDR.length > 0
}