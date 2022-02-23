import { Command } from '../../types';
import { handleRebuildTestsCommand } from './rebuild-tests.handler';

/**
 * Register the `validate` command
 *
 * @param argv
 */
export const registerRebuildTestsCommand: Command = (argv) => {
  argv.command(
    "rebuild-tests",
    "rebuild test cases",
    args => args,
    () => handleRebuildTestsCommand(),
  )
}