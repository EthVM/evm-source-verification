import path from "path";
import yargs  from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import Web3 from "web3";
import {
  opCodeCodeVerification,
  runtimeCodeVerification,
  directVerification,
  getOpCodes,
} from "./libs/verifications";
import { getByteCodeMetadata, getBytecodeWithoutMetadata } from "./libs/utils";

const { keccak256 } = Web3.utils;

type Address = string;
type Keccak256 = string;

/**
 * Map of hashes to addresses
 */
interface HashList { [keccak256: Keccak256]: Address[] };

/**
 * metadata.json contents
 */
interface Metadata {
  abi: any[]
  opcodeHash: string;
  runtimeHash: string;
  metalessHash: string;
  encodedMetadata: CborDataType;
}

interface ContractObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any[],
  evm: {
    deployedBytecode: {
      /**
       * eg. PUSH1 0x80 PUSH1 0x40 MSTORE PUSH1 0x4 CALLDATASIZE LT...
       */
      opcodes: string;
      /**
       * eg. 6080604052600436106100215760003560e01c801561002657........
       */
      object: string;
    }
  }
}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ContractFile { [objectname: string]: ContractObject };
interface CompiledOutput { contracts: { [filename: string]: ContractFile }; }

interface CliArgs {
  file: string;
  name: string;
  chainid: string;
  address: string;
  out: string;
  hashlists: {
    dir: string;
  };
  verifiedlists: {
    dir: string;
  };
}

yargs(hideBin(process.argv))
  .usage("Usage: $0 <cmd> [args]")
  .command<CliArgs>(
    "verify [file] [name] [chainid] [address] [out] [hashlists.dir] [verifiedlists.dir]",
    "compile source file and verify the code on evm based chain",
    (_yargs) => {
      _yargs.positional("file", {
        type: "string",
        describe: "path to runtime bytecode file",
      });
      _yargs.positional("name", {
        type: "string",
        describe: "contract name",
      });
      _yargs.positional("chainid", {
        type: "string",
        default: "0x01",
        describe: "chain id of the network",
      });
      _yargs.positional("address", {
        type: "string",
        describe: "address of the contract",
      });
      _yargs.positional("out", {
        type: "string",
        describe: "directory to output data",
      });
      _yargs.positional("hashlists.dir", {
        type: "string",
        describe: "directory housing the hash lists",
        default: path.join(process.cwd(), 'generated', 'hashes'),
      });
      _yargs.positional("verifiedlists.dir", {
        type: "string",
        describe: "directory housing the verified lists",
        default: path.join(process.cwd(), 'generated', 'verified'),
      });
    },
    async (argv) => {
      // process cli args
      const { file, name, chainid, address, out, hashlists, verifiedlists } = argv;

      const hashlistsDirname = path.normalize(
        path.isAbsolute(hashlists.dir)
          ? hashlists.dir
          : path.join(process.cwd(), hashlists.dir)
      );

      const verifiedlistsDirname = path.normalize(
        path.isAbsolute(verifiedlists.dir)
          ? verifiedlists.dir
          : path.join(process.cwd(), verifiedlists.dir)
      );

      // TOOD: load web3 endpoint in environment or ar
      const web3 = new Web3("https://nodes.mewapi.io/rpc/eth");
      const liveCode = await web3.eth.getCode(address);
      const compiledOutput: CompiledOutput =
        JSON.parse(fs.readFileSync(file, 'utf-8'));

      const contractName = name;

      // search the solidity compiled json output for the file containing the
      // main contract
      const mainFile = Object
        .values(compiledOutput.contracts)
        .find(contractFile => hasOwn(contractFile, contractName))

      if (!mainFile) {
        // contract not found in the output
        console.warn(`contract not found`
          + `  chainid=${chainid}`
          + `  address=${address}`
          + `  contractName=${contractName}`
        )
        process.exit(1);
      }

      const mainContract = mainFile[contractName];

      const compiledCode = mainContract.evm.deployedBytecode.object;

      const isDirectVerified = directVerification(
        liveCode.replace("0x", ""),
        compiledCode
      );
      const isRuntimeVerified = runtimeCodeVerification(
        liveCode.replace("0x", ""),
        compiledCode
      );
      const isOpCodeVerified = opCodeCodeVerification(
        liveCode.replace("0x", ""),
        compiledCode
      );
      console.log("verified direct:", isDirectVerified);
      console.log("verified runtime:", isRuntimeVerified);
      console.log("verified opcodes:", isOpCodeVerified);

      if (!isRuntimeVerified && !isOpCodeVerified) {
        console.warn(`contract ${name} is not verified`
          + `  chainid=${argv.chainid}`
          + `  address=${argv.address}`
          + `  contractName=${contractName}`
          + `  isDirectVerified=${isDirectVerified}`
          + `  isRuntimeVerified=${isRuntimeVerified}`
          + `  isOpCodeVerified=${isOpCodeVerified}`
        )
        process.exit(1);
      }

      // filenames
      const metadataFilename = path.join(out, 'metadata.json');
      const hashlistsChainDirname = path.join(hashlistsDirname, chainid);
      const verifiedlistsChainFilename = path.join(verifiedlistsDirname, `${chainid}.json`);
      const opcodeHashesFilename = path.join(hashlistsChainDirname, 'opcodes.json');
      const runtimeHashesFilename = path.join(hashlistsChainDirname, 'runtime.json');
      const metalessHashesFilename = path.join(hashlistsChainDirname, 'metaless.json');

      // metadata & hashes
      const { abi } = mainContract;
      const liveByteCode = getBytecodeWithoutMetadata(liveCode.replace(/^0x/, ''));
      const liveOpCodes = getOpCodes(Buffer.from(liveByteCode, 'hex'));
      const opcodeHash = keccak256(liveOpCodes
          .map((opcode) => opcode.code)
          .join(','));
      const metalessHash = keccak256(liveByteCode);
      const runtimeHash = keccak256(liveCode);
      const encodedMetadata = getByteCodeMetadata(Buffer.from(liveCode.replace(/^0x/, ''), 'hex'));
      const metadata: Metadata = { opcodeHash, metalessHash, runtimeHash, encodedMetadata, abi };

      // create directories
      await Promise.all([
        fs.promises.mkdir(hashlistsChainDirname, { recursive: true }),
        fs.promises.mkdir(verifiedlistsDirname, { recursive: true }),
        fs.promises.mkdir(out, { recursive: true }),
      ]);

      // upsert results
      await Promise.all([
        // set metadata
        (async () => {
          await writeJsonFile(metadataFilename, metadata, { pretty: true });
        })(),

        // modify hashlists
        // hashlists: modify opcodelist.json
        (async () => {
          const opcodeHashes = (await readJsonFile<HashList>(opcodeHashesFilename)) ?? {};
          if (!arrObjPush(opcodeHashes, opcodeHash, address)) return;
          await writeJsonFile(opcodeHashesFilename, opcodeHashes, { pretty: true });
        })(),

        // hashlists: modify runtimehashlist.json
        (async () => {
          const runtimeHashes = (await readJsonFile<HashList>(runtimeHashesFilename)) ?? {};
          if (!arrObjPush(runtimeHashes, runtimeHash, address)) return;
          await writeJsonFile(runtimeHashesFilename, runtimeHashes, { pretty: true });
        })(),

        // hashlists: modify metalesshashlist.json
        (async () => {
          const metalessHashes = (await readJsonFile<HashList>(metalessHashesFilename)) ?? {};
          if (!arrObjPush(metalessHashes, metalessHash, address)) return;
          await writeJsonFile(metalessHashesFilename, metalessHashes, { pretty: true });
        })(),

        // verifiedlists
        (async () => {
          const verifiedHashes = (await readJsonFile<Address[]>(verifiedlistsChainFilename)) ?? [];
          if (!arrPush(verifiedHashes, address)) return;
          await writeJsonFile(verifiedlistsChainFilename, verifiedHashes, { pretty: true });
        })(),
      ]);

      // move the output to the address
    }
  )
  .demandOption(["file", "name", "address"])
  .demandCommand(1)
  .parse();


/**
 * Does the object have the property on itself? (not its prototype chain)
 *
 * @param object 
 * @param property 
 * @returns 
 */
function hasOwn(
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
function readJsonFile<T>(filename: string): Promise<undefined | T> {
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
function writeJsonFile(
  filename: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  contents: object,
  options?: { pretty?: boolean },
): Promise<void> {
  const pretty = options.pretty ?? false;
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
function arrObjPush<T>(
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
function arrPush<T>(
  arr: T[],
  value: T,
) {
  if (arr.includes(value)) return false;
  arr.push(value);
  return true;
}