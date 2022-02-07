import { Command } from "../../types";
import { handleMetadataCommand } from "./metadata.handler";
import { CompileCliArgs } from "./metadata.types";

/**
 * Register the `metadata` command
 * 
 * Generate metadata for a single contract
 * 
 * @param argv
 */
export const registerMetadataCommand: Command = (argv) => {
  argv.command<CompileCliArgs>(
    "metadata",
    "verify and generate metadata for a contract"
    ,
    (args) => args
      .demandOption('--chainId')
      .positional("--chainId", {
        type: "number",
        describe: "ChainId to verify the contract against."
          + " Also specifies the fs directory if --address is provided.",
        default: 1,
      })

      .positional("--out.dir", {
        type: "string",
        describe: "Directory to place the metadata." +
          " One of either --out.dir or --out.file are required.",
      })

      .positional("--out.file", {
        type: "string",
        describe: "File to place the metadata." +
          " One of either --out.dir or --out.file are required.",
      })

      .positional("--address", {
        type: "string",
        describe: "Address to use in the default contracts directory. Requires --chainId.",
      })

      .positional("--dir", {
        type: "string",
        describe: "Contract directory with input.json and config.json files to use",
      })

      .positional("--input", {
        type: "string",
        describe: "input.json file to use. Requires --config",
      })

      .positional("--config", {
        type: "string",
        describe: "config.json file to use. Requires --input",
      })

      .positional("--pretty", {
        type: "boolean",
        default: true,
        describe: "json output will be pretty printed",
      })
    ,

    (args) => handleMetadataCommand(args),
  )
}
