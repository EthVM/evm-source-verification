import os from 'node:os';
import cp from 'node:child_process';
import cbor from "cbor";
import chalk from "chalk";
import { toB58String } from "multihashes";
import Web3 from "web3";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Address, CborDataType, CborDecodedType, HexString } from "../types";

/**
 * miscillaneous helper functions
 */


/**
 * Execute a CLI command
 */
export const pexec = promisify(cp.exec);

/**
 * Create a random filename in the tmp directory
 * 
 * Does not actually create the file
 * 
 * @returns 
 */
export function tmpFilename(): string {
  const filename = path.join(os.tmpdir(), randomBase16(20));
  return filename;
}

/**
 * Create a random tmp directory
 *
 * @returns
 */
export async function tmpDir(): Promise<string> {
  const dirname = path.join(os.tmpdir(), randomBase16(20));
  await fs.promises.mkdir(dirname, { recursive: true });
  return dirname;
}

/**
 * Convert bytes to hexidecimal
 */
export const bytesToHex = Web3.utils.bytesToHex.bind(Web3.utils);

/**
 * Convert a string or nubmer to a BN
 */
export const toBN = Web3.utils.toBN.bind(Web3.utils);


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
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: Record<string, unknown> | object,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}


/**
 * Read a UTF8 file from the filesystem
 *
 * @param filename  filename to read from the filesystem
 * @returns         string contents if it exists
 */
export function readUTF8File(filename: string): Promise<undefined | string> {
  return fs
    .promises
    .readFile(filename, 'utf-8')
    .catch((err: NodeJS.ErrnoException) => {
      if (err && err.code !== 'ENOENT') throw err;
      return undefined;
    });
}


/**
 * Write a UTF8 file to the filesystem
 *
 * @param filename  filename to write
 * @param content   string contents
 */
export function writeUTF8File(filename: string, content: string): Promise<void> {
  return fs
    .promises
    .writeFile(filename, content, 'utf-8');
}


/**
 * Read a JSON file from the filesystem
 *
 * @param filename  filename to read from the filesystem
 * @returns         the json object or undefined if the file was not found
 */
export function readJSONFile<T>(filename: string): Promise<undefined | T> {
  return readUTF8File(filename).then((str) => str === undefined
    ? str
    : JSON.parse(str) as T);
}

/**
 * Save a JSON object to a filesystem
 * 
 * @param filename  filename to save as
 * @param contents  object to save
 * @param options
 * @returns
 */
export function writeJSONFile(
  filename: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: object | unknown[],
  options?: { pretty?: boolean },
): Promise<void> {
  const pretty = options?.pretty ?? false;
  return writeUTF8File(
    filename,
    pretty
      ? JSON.stringify(contents, null, 2)
      : JSON.stringify(contents),
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

/**
 * Create a random ethereum address
 * 
 * @returns
 */
export function randomAddress(): Address {
  const address: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    address.push(Math.floor(Math.random() * 16).toString(16));
  }
  return `0x${address.join('')}`;
}


/**
 * Create a random chainId
 *
 * @returns 
 */
export function randomChainId(): number {
  return (1 + Math.floor(Math.random() * 200));
}


/**
 * Get date in format YYYY-MM-DD hh:mm:ss
 * 
 * @param date 
 * @returns 
 */
export function ymdhms(date: Date = new Date()): string {
  const YYYY = date.getUTCFullYear().toString().padStart(4, '0');
  const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const DD = date.getUTCDate().toString().padStart(2, '0');

  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');

  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

/**
 * Get the file destination relative to the process cwd
 *
 * Leaves relative filenames unchanged
 * 
 * Normalises the filename
 * 
 * @param filename    relative or absolute filename
 * @returns           relative normalised filename
 */
export function frel(filename: string): string {
  return path.normalize(path.isAbsolute(filename)
    ? path.relative(process.cwd(), filename)
    : filename);
}

export const HOME_DIR = new RegExp(`^~(\\${path.sep}|$)`);

/**
 * Get the absolute file destination assuming it's relatively based at the
 * process cwd
 *
 * Leaves absolute filenames unchanged
 * 
 * Normalises the filename
 * 
 * @param filename    relative or absolute filename
 * @returns           absolute normalised filename
 */
export function fabs(filename: string): string {
  // is targetting the home directory with ~?
  if (HOME_DIR.test(filename)) {
    // replace ^~ with the actual litereal home directory
    return filename.replace(HOME_DIR, `${os.homedir()}$1`);
  }

  return path.normalize(path.isAbsolute(filename)
    ? filename
    : path.join(process.cwd(), filename))
}


/**
 * Does the file exist (and is a file?)?
 * 
 * @param filename  relative or absolute filename
 *                  if the filename is relative it will be treated as relative
 *                  to the cwd
 * @returns         whether the file exists
 * @throws          if the file is a directory
 */
export async function fexists(filename: string): Promise<boolean> {
  try {
    await fs.promises.access(fabs(filename));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
}


/**
 * Is the value a safe filename
 * 
 * asserts that the filename only contains safe expected characters
 * (doesn't contain slashes or weird unexpected characters)
 *
 * Helps protect against simple script injection attacks
 *
 * @param filename    filename to check
 * @returns           if the filename has only safe characters
 */
export function isSafeFilename(filename: string): boolean {
  if (!filename) return false;
  return isSafeFilename.regex.test(filename);
}
/**
 * Allows: 0-9, a-z, A-Z, _, -, ., ' ', +
 */
isSafeFilename.regex = /^[0-9a-zA-Z_\-=. +]+$/;


/**
 * Execute a CLI command, piping the input into it
 *
 * Pipe the given input into it
 *
 * @param command   command to execute
 * @param input     input to pipe into the command
 * @param options   execution options, including max buffer size of stdout
 * @returns         resulting stdout
 */
export function pexecPipe(
  command: string,
  input: string,
  options: cp.ExecOptions,
): Promise<{ stdout: string, stderr: string }> {
  return new Promise((res, rej) => {
    const proc = cp.exec(
      command,
      { ...options },
      (err, stdout, stderr) => {
        if (err) return rej(err);
        res({ stdout, stderr });
      },
    );
    proc.stdin!.write(input);
    proc.stdin!.end();
  });
}


/**
 * Get a value if if the key already exists
 *
 * Otherwise create a new value
 * 
 * @param map       host map
 * @param key       target key
 * @param create    value factory - creates the value if they key doesn't exist
 * @returns         value (new or old) at the key
 */
export function mapGetOrCreate<K, V>(
  map: Map<K, V>,
  key: K,
  create: () => V,
): V {
  if (map.has(key)) return map.get(key)!;
  const value = create();
  map.set(key, value);
  return value;
}

/**
 * Update or insert a new value into a map
 *
 * @param map           host map
 * @param key           target key
 * @param upsert        update function
 * @param initialValue  initial value at the ey
 * @returns             upserted value
 */
export function mupsert<K, V>(
  map: Map<K, V>,
  key: K,
  upsert: (prev: V) => V,
  initialValue: V
): V {
  let initial: V;
  if (map.has(key)) initial = map.get(key)!;
  else initial = initialValue;
  const next = upsert(initial);
  map.set(key, next);
  return next;
}


/**
 * Normalise chainId
 *
 * @param raw     raw chainId input
 * @returns       normalised chainId output
 */
export function toChainId(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  // parse as hex
  if (raw.startsWith('0x')) return parseInt(raw, 16);
  // only accept base 10
  if (/^[0-9]+$/.test(raw)) return Number(raw);
  throw new Error(`unable to convert value to chainId: "${raw}"`);
}

export function eng(number: number): string {
  return number.toLocaleString('en-US');
}

export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

/**
 * interpolate the color from low (cyan) to high (red)
 * to apply to the string
 * 
 * @param low       green value
 * @param value     actual value
 * @param high      red value
 * @param string    string to color
 * @returns         colored string
 */
export function interpolateColor(
  low: number,
  value: number,
  high: number,
  string: string,
): string {
  const interpolation = (value - low) / (high - low);
  if (interpolation <= 0) return chalk.cyan(string);
  if (interpolation >= 1) return chalk.red(string);
  const between = ['green', 'yellow'] as const;
  const idxMax = between.length - 1;
  const idx = clamp(0, Math.round(idxMax * interpolation), idxMax);
  const color = between[idx];
  return chalk[color](string);
}


/**
 * Create a random base 16 string of the desired length
 *
 * @param length      length of the string
 * @returns           random string
 */
export function randomBase16(length: number): string {
  let str = '';
  for (let i = 0; i < length; i += 1) {
    str += Math.floor(16 * Math.random()).toString(16);
  }
  return str;
}

/**
 * Immutably sort the keys of an object
 * 
 * @param object 
 * @returns 
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortKeys<T extends Record<any, any>>(object: T): T {
  const out: T = {} as T;
  Object
    .keys(object)
    .sort()
    .forEach(key => { out[key as keyof T] = object[key] });
  return object;
}
