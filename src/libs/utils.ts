import cbor from "cbor";
import { toB58String } from "multihashes";
import { bytesToHex } from "web3-utils";
import fs from 'fs';

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
 *
 * @param  {HexString} bytecode
 * @return {HexString} bytecode   without leading & minus metadata
 */
export function getBytecodeWithoutMetadata(bytecode: HexString): HexString {
  if (bytecode.startsWith('0x')) bytecode = bytecode.replace(/^0x/, '');

  // Usually last 4 chars of bytecode specify byte size of metadata component,
  // however if the contract has create or create2 it is possible for metadata
  // info to exist in the middle of the code
  try {
    // fail safe to make sure we are not removing anything other than metadata
    // (skip to catch if there's no metadata)
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
        // fail safe to make sure we are not removing anything other than metadata
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

/**
 * Extract all metadata from the bytecode
 *
 * @param bytecode
 * @returns
 */
export function getBytecodeMetadatas(bytecode: string): CborDataType[] {
  if (bytecode.startsWith('0x')) bytecode = bytecode.replace(/^0x/, '');

  // Usually last 4 chars of bytecode specify byte size of metadata component,
  // however if the contract has create or create2 it is possible for metadata
  // info to exist in the middle of the code
  const metadatas: CborDataType[] = [];
  try {
    metadatas.push(getByteCodeMetadata(Buffer.from(bytecode, "hex")));
    // Last 4 chars of bytecode specify byte size of metadata component
    const suffix = bytecode.slice(-4); 
    let index = 0;
    while (bytecode.indexOf(suffix, index) > -1) {
      const metapos = bytecode.indexOf(suffix, index);
      const metadataSize =
        parseInt(bytecode.slice(metapos, metapos + 4), 16) * 2;
      const metadata = bytecode.slice(metapos - metadataSize, metapos + 4);
      try {
        // fail safe to make sure we are not removing anything other than metadata
        metadatas.push(getByteCodeMetadata(Buffer.from(metadata, "hex"))); 
        bytecode = bytecode.replace(metadata, "");
      } catch (e) {
        index = metapos + 4;
      }
    }
    return metadatas;
  } catch (e) {
    return metadatas;
  }
}

/**
 * Does the object have the property on itself? (not its prototype chain)
 *
 * @param object 
 * @param property 
 * @returns 
 */
export function hasOwn(
  object: Record<string, unknown>,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

/**
 * Read a JSON file from the filesystem
 *
 * @param filename  filename to read from the filesystem
 * @returns         the json object or undefined if the file was not found
 */
export function readJsonFile<T>(filename: string): Promise<undefined | T> {
  return fs
    .promises
    .readFile(filename, 'utf-8')
    .then(raw => JSON.parse(raw) as T)
    .catch((err: NodeJS.ErrnoException) => {
      if (err && err.code !== 'ENOENT') throw err;
      return undefined;
    });
}

/**
 * Save a JSON object to a filesystem
 * 
 * @param filename  filename to save as
 * @param contents  object to save
 * @param options
 * @returns
 */
export function writeJsonFile(
  filename: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: object,
  options?: { pretty?: boolean },
): Promise<void> {
  const pretty = options?.pretty ?? false;
  return fs.promises.writeFile(
    filename,
    pretty
      ? JSON.stringify(contents, null, 2)
      : JSON.stringify(contents),
    'utf-8',
  );
}

/**
 * Append a value to an record whose values are arrays
 * 
 * Return true if the record was modified, otherwise return false
 * 
 * @param record    object with array values
 * @param key       key on the object
 * @param value     value to push
 */
export function arrObjPush<T>(
  record: Record<string, T[]>,
  key: string,
  value: T,
): boolean {
  if (!hasOwn(record, key)) record[key] = [];
  return arrPush(record[key], value);
}

/**
 * Push an item on the array if it isn't already
 *
 * @param arr     array
 * @param value   value to push
 * @returns       whether the item was pushed
 */
export function arrPush<T>(
  arr: T[],
  value: T,
): boolean {
  if (arr.includes(value)) return false;
  arr.push(value);
  return true;
}