import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import Web3 from "web3";
import { config as dotenv } from 'dotenv';
import {
  opCodeCodeVerification,
  runtimeCodeVerification,
  directVerification,
} from "./libs/verifications";
import {
  arrObjPush,
  arrPush,
  getBytecodeMetadatas,
  getBytecodeWithoutMetadata,
  hasOwn,
  readJsonFile,
  writeJsonFile,
} from "./libs/utils";
import * as hash from './libs/hash';

const toBN = Web3.utils.toBN.bind(Web3.utils);


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
  providerUri: undefined | string;
}

dotenv();

yargs(hideBin(process.argv))
  .usage("Usage: $0 <cmd> [args]")
  .command<CliArgs>(
    "verify [file] [name] [chainid] [address] [out] [provider-uri] [hashlists.dir] [verifiedlists.dir]",
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
      _yargs.positional("provider-uri", {
        type: "string",
        describe: "web3 provider",
        default: process.env.PROVIDER_URI,
      });
      _yargs.positional("hashlists.dir", {
        type: "string",
        describe: "directory with the hash lists",
        default: path.join(process.cwd(), "generated", "hashes"),
      });
      _yargs.positional("verifiedlists.dir", {
        type: "string",
        describe: "directory with the verified lists",
        default: path.join(process.cwd(), "generated", "verified"),
      });
    },
    async (argv) => {
      // process cli args
      const { file, name, address, out, hashlists, verifiedlists, providerUri } = argv;
      const chainid = toBN(argv.chainid).toString(10);

      if (!providerUri) {
        throw new TypeError('You muse give either a --provider-uri'
          + ' argument or set a PROVIDER_URI environment variable for your Web3'
          + ' endpoint');
      }

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
      const web3 = new Web3(providerUri);
      const liveCode = await web3.eth.getCode(address);
      const compiledOutput: CompiledOutput = JSON.parse(
        fs.readFileSync(file, "utf-8")
      );

      const contractName = name;

      // search the solidity compiled json output for the file containing the
      // main contract
      const mainFile = Object.values(compiledOutput.contracts).find(
        (contractFile) => hasOwn(contractFile, contractName)
      );

      if (!mainFile) {
        // contract not found in the output
        console.warn(
          `contract not found` +
            `  chainid=${chainid}` +
            `  address=${address}` +
            `  contractName=${contractName}`
        );
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
        console.warn(
          `contract ${name} is not verified` +
            `  chainid=${argv.chainid}` +
            `  address=${argv.address}` +
            `  contractName=${contractName}` +
            `  isDirectVerified=${isDirectVerified}` +
            `  isRuntimeVerified=${isRuntimeVerified}` +
            `  isOpCodeVerified=${isOpCodeVerified}`
        );
        process.exit(1);
      }

      // filenames

      const metadataFilename = path.join(out, "metadata.json");

      const verifiedlistsChainFilename = path.join(
        verifiedlistsDirname,
        `${chainid}.json`
      );

      const hashlistsChainDirname = path.join(hashlistsDirname, chainid);
      const opcodeHashesFilename = path.join(
        hashlistsChainDirname,
        "opcodes.json"
      );
      const runtimeHashesFilename = path.join(
        hashlistsChainDirname,
        "runtime.json"
      );
      const metalessHashesFilename = path.join(
        hashlistsChainDirname,
        "metaless.json"
      );

      // metadata & hashes
      const { abi } = mainContract;
      const metalessBytecode = getBytecodeWithoutMetadata(liveCode);
      const opcodeHash = hash.opcode.fromMetadatalessBytecode(metalessBytecode);
      const metalessHash = hash.metaless.fromMetadatalessBytecode(metalessBytecode);
      const runtimeHash = hash.runtime.fromRuntimeBytecode(liveCode);

      // keep only unique encoded metadata
      // TODO: it seems every call to `getBytecodeMetadatas` produces duplicate
      // metadata elements, can this be resoled in `getBytecodeMetadatas`?
      const encodedMetadata: CborDataType[] = getBytecodeMetadatas(liveCode);

      const uniqueEncodedMetadata: CborDataType[] = Array.from(
        new Set(encodedMetadata.map(JSON.stringify.bind(JSON)))
      ).map(JSON.parse.bind(JSON));

      const metadata: Metadata = {
        opcodeHash,
        metalessHash,
        runtimeHash,
        encodedMetadata: uniqueEncodedMetadata,
        abi,
        deployedBytecode: {
          object: mainContract.evm.deployedBytecode.object,
        },
        bytecode: {
          object: mainContract.evm.bytecode.object,
        },
      };

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
          const opcodeHashes =
            (await readJsonFile<HashList>(opcodeHashesFilename)) ?? {};
          if (!arrObjPush(opcodeHashes, opcodeHash, address)) return;
          await writeJsonFile(opcodeHashesFilename, opcodeHashes, {
            pretty: true,
          });
        })(),

        // hashlists: modify runtimehashlist.json
        (async () => {
          const runtimeHashes =
            (await readJsonFile<HashList>(runtimeHashesFilename)) ?? {};
          if (!arrObjPush(runtimeHashes, runtimeHash, address)) return;
          await writeJsonFile(runtimeHashesFilename, runtimeHashes, {
            pretty: true,
          });
        })(),

        // hashlists: modify metalesshashlist.json
        (async () => {
          const metalessHashes =
            (await readJsonFile<HashList>(metalessHashesFilename)) ?? {};
          if (!arrObjPush(metalessHashes, metalessHash, address)) return;
          await writeJsonFile(metalessHashesFilename, metalessHashes, {
            pretty: true,
          });
        })(),

        // verifiedlists
        (async () => {
          const verifiedHashes =
            (await readJsonFile<Address[]>(verifiedlistsChainFilename)) ?? [];
          if (!arrPush(verifiedHashes, address)) return;
          await writeJsonFile(verifiedlistsChainFilename, verifiedHashes, {
            pretty: true,
          });
        })(),
      ]);

      // move the output to the address
    }
  )
  .demandOption(["file", "name", "address", "out"])
  .demandCommand(1)
  .parse();
