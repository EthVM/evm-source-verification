type CborDecodedType = {
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

type OpCodeType = {
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
type HexBuffer = Buffer;

type HexString = string;

type Hexable = HexBuffer | HexString;

/**
 * Hex string with length of 42, 40 without 0x
 */
type Address = string;

/**
 * Sha256 hash
 *
 * Algorithm implementation comes from Web3 utils
 */
type Keccak256 = string;

/**
 * Raw runtime bytecode of a contract on the blockchain
 */
type RuntimeBytecode = string;

/**
 * Bytecode with metadata stripped out
 */
type MetadatalessBytecode = string;

/**
 * Map of hashes to addresses
 */
interface HashList {
  [keccak256: Keccak256]: Address[];
}

/**
 * metadata.json contents
 */
interface Metadata {
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

interface ContractObject {
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
interface ContractFile {
  [objectname: string]: ContractObject;
}
interface CompiledOutput {
  contracts: { [filename: string]: ContractFile };
}
