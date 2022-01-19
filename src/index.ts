import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import Web3 from "web3";
import {
  opCodeCodeVerification,
  runtimeCodeVerification,
} from "./libs/verifications";

yargs(hideBin(process.argv))
  .usage("Usage: $0 <cmd> [args]")
  .command(
    "verify [file] [mode] [name] [chainid] [address]",
    "compile source file and verify the code on evm based chain",
    (_yargs) => {
      _yargs.positional("file", {
        type: "string",
        describe: "path to runtime bytecode file",
      });
      _yargs.positional("mode", {
        type: "string",
        describe: "single-file or standard-json",
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
      // console.info(argv);
      const web3 = new Web3("https://nodes.mewapi.io/rpc/eth");
      const liveCode = await web3.eth.getCode(argv.address);
      let compiledCode;
      if (argv.mode === "standard-json") {
        const outputJson = fs.readFileSync(argv.file);
        const jsonData = JSON.parse(outputJson.toString("utf8"));
        const contracts = Object.keys(jsonData.contracts);
        // eslint-disable-next-line no-restricted-syntax
        for (const contract of contracts) {
          if (Object.keys(jsonData.contracts[contract]).includes(argv.name)) {
            const mainContract = jsonData.contracts[contract][argv.name];
            compiledCode = mainContract.evm.deployedBytecode.object;
          }
        }
      } else if (argv.mode === "single-file") {
        compiledCode = fs.readFileSync(argv.file);
      }
      console.log(
        "verified direct:",
        runtimeCodeVerification(liveCode.replace("0x", ""), compiledCode)
      );
      console.log(
        "verified opcodes:",
        opCodeCodeVerification(liveCode.replace("0x", ""), compiledCode)
      );
    }
  )
  .demandOption(["file", "mode", "name", "address"])
  .demandCommand(1)
  .parse();
