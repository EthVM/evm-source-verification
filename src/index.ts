import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import Web3 from "web3";
import {
  opCodeCodeVerification,
  runtimeCodeVerification,
  directVerification,
} from "./libs/verifications";

yargs(hideBin(process.argv))
  .usage("Usage: $0 <cmd> [args]")
  .command(
    "verify [file] [name] [chainid] [address]",
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
    },
    async (argv: any) => {
      const web3 = new Web3("https://nodes.mewapi.io/rpc/eth");
      const liveCode = await web3.eth.getCode(argv.address);
      const outputJson = fs.readFileSync(argv.file);
      const jsonData = JSON.parse(outputJson.toString("utf8"));
      const contracts = Object.keys(jsonData.contracts);
      // eslint-disable-next-line no-restricted-syntax
      for (const contract of contracts) {
        if (Object.keys(jsonData.contracts[contract]).includes(argv.name)) {
          const mainContract = jsonData.contracts[contract][argv.name];
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
          if (!isRuntimeVerified && !isOpCodeVerified) process.exit(1);
          return;
        }
      }
    }
  )
  .demandOption(["file", "name", "address"])
  .demandCommand(1)
  .parse();
