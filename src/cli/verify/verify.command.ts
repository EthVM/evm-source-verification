import { Command } from "../../types";
import { VerifyCliArgs } from "./verify.types";
import { handleVerifyCommand } from "./verify.handler";

/**
 * Register the `verify` command
 * 
 * Compile and verify many contracts
 * 
 * @param argv
 */
export const registerVerifyCommand: Command = (argv) => {
  argv.command<VerifyCliArgs>(
    "verify",
    "compile source file and verify the code on evm based chain",
    (args) => args
      .positional("--chainId", {
        type: "string",
        describe: "Verify contracts at this chainId.",
      })

      .positional("--address", {
        type: "string",
        describe: "Verify the contract with address. Requires --chainId.",
      })

      .positional("--file", {
        type: "string",
        describe: "Verify contracts specified in a file (or stdin if" +
          " file == '-'). File should be new-line separated list of" +
          " contract directories",
      })

      .positional("--skip", {
        type: "boolean",
        describe: "Skip contracts that have already have metadata (have" +
          " been verified)",
        default: false,
      })

      .positional("--save", {
        type: "boolean",
        describe: "Save metadta of successfully verified contracts",
        default: false,
      })

      .positional("--failFast", {
        type: "boolean",
        describe: "Exit on first error",
        default: false,
      })
      ,

    (args) => handleVerifyCommand(args),
  )
}
