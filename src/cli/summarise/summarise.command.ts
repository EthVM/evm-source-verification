import { Command } from "../../types";
import { handleSummariseCommand } from "./summarise.handler";

/**
 * Register the `summarise` command
 * 
 * Summarises metadata of verified contracts
 * 
 * @param argv
 */
export const registerSummariseCommand: Command = (argv) => {
  argv.command(
    "summarise",
    "rebuild the summary of all verified contracts",
    (args) => args,
    () => handleSummariseCommand(),
  )
}
