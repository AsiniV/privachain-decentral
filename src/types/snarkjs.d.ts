/**
 * Type declarations for snarkjs
 * This provides basic TypeScript type support for the snarkjs library
 */

declare module 'snarkjs' {
  export namespace groth16 {
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFileName: string
    ): Promise<{ proof: any; publicSignals: string[] }>;

    export function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;

    export function exportSolidityCallData(proof: any, publicSignals: string[]): Promise<string>;
  }

  export namespace plonk {
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFileName: string
    ): Promise<{ proof: any; publicSignals: string[] }>;

    export function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
  }

  export namespace powersOfTau {
    export function newAccumulator(
      curve: any,
      power: number,
      name: string,
      logger?: any
    ): Promise<void>;

    export function contribute(
      oldPtauFilename: string,
      newPTauFilename: string,
      name: string,
      entropy: any,
      logger?: any
    ): Promise<void>;
  }

  export namespace r1cs {
    export function info(r1csName: string, logger?: any): Promise<any>;
    export function print(r1csName: string, symName: string, logger?: any): Promise<void>;
    export function exportJson(r1csName: string, logger?: any): Promise<any>;
  }

  export namespace wtns {
    export function calculate(
      input: any,
      wasmFileName: string,
      wtnsFileName: string,
      options?: any
    ): Promise<void>;

    export function debug(
      input: any,
      wasmFileName: string,
      wtnsFileName: string,
      symName: string,
      options?: any,
      logger?: any
    ): Promise<void>;

    export function exportJson(wtnsFileName: string): Promise<any>;
  }

  export namespace zKey {
    export function newZKey(
      r1csName: string,
      ptauName: string,
      zkeyName: string,
      logger?: any
    ): Promise<void>;

    export function contribute(
      oldZkeyName: string,
      newZKeyName: string,
      name: string,
      entropy: any,
      logger?: any
    ): Promise<void>;

    export function exportVerificationKey(zkeyName: string, logger?: any): Promise<any>;

    export function exportJson(zkeyName: string, logger?: any): Promise<any>;
  }
}
