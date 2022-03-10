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
export interface ContractMetadata {
  abi: any[];
  compiler: string;
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

/**
 * Solidity ouptut when compilation succeeds
 */
export interface CompilerOutputOk {
  contracts: {
    [filename: string]: ContractSourceFile;
  };
  sources: {
    [filename: string]: {
      ast?: ContractSourceFile
    };
  };
}

/**
 * Solidity Output when compilation failed
 */
export interface CompilerOutputErr {
  errors: SolidityError[],
}

/**
 * Solidity compilation output
 */
export interface CompilerOutput extends
  Partial<CompilerOutputOk>,
  Partial<CompilerOutputErr> {}

/**
 * Configuration for a contract
 */
export interface ContractConfig {
  name: string;
  address: Address;
  chainId: number | string;
  compiler: string;
}

/**
 * Compiler's standard input for a contract
 */
export interface CompilerInput {
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

/**
 * Represents an object that belong to a chain
 */
export interface IHasChainId {
  /**
   * Id of the chain of this object
   * 
   * @see [ChainList](https://chainlist.org/)
   *
   * @example 1
   */
  readonly chainId: ChainId;
}

/**
 * Represents an object that belong to an address
 */
export interface IHasAddress {
  /**
   * Lowercase address of the contract of this object
   *
   * @example "0x0a0bbc022542ebe87ab4f58b3960e7b6176f704d"
   */
  readonly address: Address;
}

/**
 * Represents an object relating to a contract
 */
export interface IContractIdentity extends IHasChainId, IHasAddress {}

/**
 * Define common filesystem locations & utilities for the project
 */

/**
 * Solidity Error output type
 */
export type SolidityError = Record<string, unknown>;
