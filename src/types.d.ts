import yargs, { string } from 'yargs';

export type CborDecodedType = {
  ipfs?: Buffer;
  bzzr0?: Buffer;
  bzzr1?: Buffer;
  solc?: Buffer;
};

type CborDataType = {
  ipfs?: string;
  bzzr0?: string;
  bzzr1?: string;
  solc?: string;
};

export type OpCodeType = {
  code: string;
  data?: Buffer;
  byte: number;
};

/**
 * Buffer of type 'hex'
 * 
 * Created with `Buffer.from('0x...', 'hex')`
 * 
 * Automatically strips invalid non-hex characters and trims hex strings to
 * valid length
 */
export type HexBuffer = Buffer;

export type HexString = string;

export type Hexable = HexBuffer | HexString;

/**
 * Hex string with length of 42, 40 without 0x
 */
export type Address = string;

/**
 * Sha256 hash
 *
 * Algorithm implementation comes from Web3 utils
 */
export type Keccak256 = string;

/**
 * Raw runtime bytecode of a contract on the blockchain
 */
export type RuntimeBytecode = string;

/**
 * Bytecode with metadata stripped out
 */
export type MetadatalessBytecode = string;

/**
 * Map of hashes to addresses
 */
interface HashList {
  [keccak256: Keccak256]: Address[];
}

/**
 * metadata.json contents
 */
export interface VerifiedMetadata {
  abi: any[];
  opcodeHash: string;
  runtimeHash: string;
  metalessHash: string;
  encodedMetadata: CborDataType[];
  deployedBytecode: {
    object: string;
  };
  bytecode: {
    object: string;
  };
}

export interface ContractSourceObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any[];
  evm: {
    bytecode: {
      /**
       * eg. 60a060405234801561001057600080fd5b5......
       */
      object: string;
    };
    deployedBytecode: {
      /**
       * eg. PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x4 CALLDATASIZE LT...
       */
      opcodes: string;
      /**
       * eg. 6080604052600436106100215760003560e01c801561002657........
       */
      object: string;
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ContractSourceFile {
  [objectname: string]: ContractSourceObject;
}

export interface CompiledOutput {
  contracts: { [filename: string]: ContractSourceFile };
}

export interface ContractConfig {
  name: string;
  address: Address;
  chainId: number | string;
  compiler: string;
}

export interface ContractInput {
  // TODO
}

export interface Command {
  // eslint-disable-next-line @typescript-eslint/ban-types
  (argv: yargs.Argv<{}>): void;
}


// https://github.com/ChainSafe/web3.js/blob/1.x/packages/web3-utils/types/index.d.ts#L218
export interface AbiItem {
  anonymous?: boolean;
  constant?: boolean;
  inputs?: AbiInput[];
  name?: string;
  outputs?: AbiOutput[];
  payable?: boolean;
  stateMutability?: StateMutabilityType;
  type: AbiType;
  gas?: number;
}

export interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
	components?: AbiInput[];
  internalType?: string;
}

export interface AbiOutput {
  name: string;
  type: string;
	components?: AbiOutput[];
  internalType?: string;
}

export type ChainId = number;

export interface HasChainId { chainId: ChainId; }
export interface HasAddress { address: Address; }
/** Minimal info required to locate a contract */
export interface ContractIdentity extends HasChainId, HasAddress {}

/**
 * Define common filesystem locations & utilities for the project
 */

/**
 * Contract info extractable from a filename
 */
export interface ContractFileMatch {
  /**
   * Everything in the path after the address
   * contracts/:chainid/:address/:subpath
   */
  subpath: string;
  original: string;
  chainId: number;
  address: string;
  dir: string;
}

/**
 * Contact compiler
 */
export interface ICompiler {
  /**
   * Compile a contract
   *
   * @param compilername        compiler name to use
   * @param input               input for the compiler
   */
  async compile(
    compilername: string,
    input: ContractInput,
  ): Promise<CompiledOutput>;
}