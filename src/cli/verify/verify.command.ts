import os from 'node:os';
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
        describe: "Verify contracts of this chainId.",
      })

      .positional("--address", {
        type: "string",
        describe: "Verify the contract with this address and the given" +
          " chainId. Requires --chainId.",
      })

      .positional("--dirs", {
        type: "string",
        describe: "Verify contracts within the provided directories." +
          " Expects a new-line separated string of directories." +
          " Reads from stdin if --dirs=-",
      })

      .positional("--skip", {
        type: "boolean",
        describe: "Skip contracts that have already been verified" +
          " i.e. contracts that have metadata",
        default: false,
      })

      .positional("--save", {
        type: "boolean",
        describe: "Save metadata of successfully verified contracts",
        default: false,
      })

      .positional("--failFast", {
        type: "boolean",
        describe: "Exit on first error",
        default: false,
      })

      .positional("--jump", {
        type: "number",
        describe: "Jump past this many contracts before starting to verify",
      })

      .positional("--concurrency", {
        type: "number",
        describe: "Number of contracts to verify in parallel."
          + " Defaults to the number of CPUs.",
        default: os.cpus().length,
      })
      ,

    (args) => handleVerifyCommand(args),
  )
}
