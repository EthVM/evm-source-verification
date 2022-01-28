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

type Address = string;
type Keccak256 = string;

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
