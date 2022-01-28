import { Command } from "../../types";
import { handleCompileCommand } from "./compile.handler";
import { CompileCliArgs } from "./compile.types";

/**
 * Register the `compile` command
 * 
 * @param argv
 */
export const registerCompileCommand: Command = (argv) => {
  argv.command<CompileCliArgs>(
    "compile",
    "compile a contract"
    ,
    (args) => args
      .positional("--out.dir", {
        type: "string",
        describe: "Directory to place the compiled output." +
          " One of either --out.dir or --out.file are required.",
      })

      .positional("--out.file", {
        type: "string",
        describe: "File to place the compiled output." +
          " One of either --out.dir or --out.file are required.",
      })

      .positional("--chainId", {
        type: "number",
        describe: "ChainId to use in the default contracts directory. Requires --address",
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

    (args) => handleCompileCommand(args),
  )
}
