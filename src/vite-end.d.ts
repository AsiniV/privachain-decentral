/// <reference types="vite/client" />

// Add types for CosmJS integration
declare module '@cosmjs/stargate' {
  export interface SigningStargateClient {
    signAndBroadcast: (signerAddress: string, messages: readonly any[], fee: any, memo?: string) => Promise<any>
  }
}

declare module '@cosmjs/proto-signing' {
  export interface DirectSecp256k1HdWallet {
    getAccounts(): Promise<readonly any[]>
    mnemonic?: string
  }
}

declare module 'cosmjs-types/cosmwasm/wasm/v1/tx' {
  export const MsgExecuteContract: any
  export const MsgInstantiateContract: any
}
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string