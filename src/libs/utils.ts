import cbor from "cbor";
import { toB58String } from "multihashes";
import { bytesToHex } from "web3-utils";

// https://github.com/ethereum/sourcify
/**
 * Extracts cbor encoded segement from bytecode
 * @example
 *   const bytes = Web3.utils.hexToBytes(evm.deployedBytecode);
 *   cborDecode(bytes);
 *   > { ipfs: Buffer<05, 45, ..> }
 *
 * @param  {Buffer} bytecode
 * @return {CborDecodedType}
 */
export function cborDecode(bytecode: Buffer): CborDecodedType {
  const cborLength: number =
    bytecode[bytecode.length - 2] * 0x100 + bytecode[bytecode.length - 1];
  const bytecodeBuffer = Buffer.from(
    bytecode.slice(bytecode.length - 2 - cborLength, -2)
  );
  return cbor.decodeFirstSync(bytecodeBuffer);
}

// https://github.com/ethereum/sourcify
/**
 * Parse cbor decoded hex data
 * @example
 *   cborParse({ ipfs: Buffer<05, 45, ..> });
 *   > { ipfs: "QmarHSr9aSNaPSR6G9KFPbuLV9aEqJfTk1y9B8pdwqK4Rq" }
 *
 * @param  {CborDecodedType} cborData
 * @return {CborDataType}
 */
export function cborParse(cborData: CborDecodedType): CborDataType {
  const cborRet: CborDataType = {};
  if (cborData.bzzr0) {
    cborRet.bzzr0 = `/swarm/bzzr0/${bytesToHex([...cborData.bzzr0]).slice(2)}`;
  }
  if (cborData.bzzr1) {
    cborRet.bzzr1 = `/swarm/bzzr1/${bytesToHex([...cborData.bzzr1]).slice(2)}`;
  }
  if (cborData.ipfs) {
    cborRet.ipfs = `/ipfs/${toB58String(cborData.ipfs)}`;
  }
  if (cborData.solc) {
    cborRet.solc = `${cborData.solc.join(".")}`;
  }
  return cborRet;
}

/**
 * Parse bytecode to metadata
 * @example
 *   getByteCodeMetaData(Buffer<60., 50, ...>);
 *   > { ipfs: "QmarHSr9aSNaPSR6G9KFPbuLV9aEqJfTk1y9B8pdwqK4Rq" }
 *
 * @param  {bytecode} Buffer
 * @return {CborDataType}
 */
export function getByteCodeMetadata(bytecode: Buffer): CborDataType {
  return cborParse(cborDecode(bytecode));
}

// https://github.com/ethereum/sourcify
/**
 * Removes post-fixed metadata from a bytecode string
 * (for partial bytecode match comparisons )
 * @param  {string} bytecode
 * @return {string} bytecode minus metadata
 */
export function getBytecodeWithoutMetadata(bytecode: string): string {
  // Usually last 4 chars of bytecode specify byte size of metadata component,
  // however if the contract has create or create2 it is possible for metadata
  // info to exist in the middle of the code
  try {
    // TODO: is this intentional ? (to see if it errors?)
    getByteCodeMetadata(Buffer.from(bytecode, "hex")); 
    // Last 4 chars of bytecode specify byte size of metadata component
    const suffix = bytecode.slice(-4); 
    let index = 0;
    while (bytecode.indexOf(suffix, index) > -1) {
      const metapos = bytecode.indexOf(suffix, index);
      const metadataSize =
        parseInt(bytecode.slice(metapos, metapos + 4), 16) * 2;
      const metadata = bytecode.slice(metapos - metadataSize, metapos + 4);
      try {
        // fail safe to make sure we are not removing anything other than
        // metadata
        // TODO: is this intentional ? (to see if it errors?)
        getByteCodeMetadata(Buffer.from(metadata, "hex")); 
        bytecode = bytecode.replace(metadata, "");
      } catch (e) {
        index = metapos + 4;
      }
    }
    return bytecode;
  } catch (e) {
    return bytecode;
  }
}
