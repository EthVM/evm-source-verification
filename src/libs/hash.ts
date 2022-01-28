import Web3 from 'web3';
import { Hexable, Keccak256, MetadatalessBytecode, RuntimeBytecode } from '../types';
import { getBytecodeWithoutMetadata } from './utils';
import { getOpCodes } from './verifications';
import * as hex from './hex';

const web3keccak256 = Web3.utils.keccak256.bind(Web3.utils);

/**
 * Keccak256 hash a hexable input
 *
 * Normalises the hex string before hashing
 *
 * @param hexInput 
 * @returns 
 */
export function safeKeccak256(hexInput: Hexable): Keccak256 {
  const normalised = hex.normalise(hexInput);
  return web3keccak256(normalised);
}

export const opcode = {
  /**
   * Calculate the opcode hash from the runtime bytecode
   * 
   * @param runtimeBytecode 
   * @returns 
   */
  fromRuntimeBytecode(runtimeBytecode: RuntimeBytecode): Keccak256 {
    const metadatalessBytecode = getBytecodeWithoutMetadata(runtimeBytecode);
    const hash = opcode.fromMetadatalessBytecode(metadatalessBytecode);
    return hash;
  },

  /**
   * Calculate the opcode hash from the metadataless bytecode
   * 
   * @param runtimeBytecode 
   * @returns 
   */
  fromMetadatalessBytecode(metadatalessBytecode: MetadatalessBytecode): Keccak256 {
    const bytecodeBuffer = hex.buf(metadatalessBytecode);
    const opcodesTypes = getOpCodes(bytecodeBuffer);
    const hash = safeKeccak256(Buffer.from(opcodesTypes.map(({ byte }) => byte)));
    return hash;
  },
}

export const metaless = {
  /**
   * Calculate the metaless hash from the runtime bytecode
   * 
   * @param runtimeBytecode 
   * @returns 
   */
  fromRuntimeBytecode(runtimeBytecode: RuntimeBytecode): Keccak256 {
    const metadatalessBytecode = getBytecodeWithoutMetadata(runtimeBytecode);
    const hash = metaless.fromMetadatalessBytecode(metadatalessBytecode);
    return hash;
  },

  /**
   * Calculate the metaless hash from the metadataless bytecode
   * 
   * @param runtimeBytecode 
   * @returns 
   */
  fromMetadatalessBytecode(metadatalessBytecode: MetadatalessBytecode): Keccak256 {
    const hash = safeKeccak256(metadatalessBytecode);
    return hash;
  },
}

export const runtime = {
  /**
   * Calculate the runtime hash from the runtime bytecode
   * 
   * @param runtimeBytecode 
   * @returns 
   */
  fromRuntimeBytecode(runtimeBytecode: RuntimeBytecode): Keccak256 {
    return safeKeccak256(runtimeBytecode);
  },
}
