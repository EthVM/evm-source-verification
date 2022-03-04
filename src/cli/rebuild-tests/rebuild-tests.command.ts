import { Command } from '../../types';
import { handleRebuildTestsCommand } from './rebuild-tests.handler';
import { RebuildTestsCliArgs } from './rebuild-tests.types';

/**
 * Register the `validate` command
 *
 * @param argv
 */
export const registerRebuildTestsCommand: Command = (argv) => {
  argv.command<RebuildTestsCliArgs>(
    "rebuild-tests",
    "rebuild test cases",
    args => args
      .positional('--skipCompilers', {
        type: 'boolean',
        describe: 'do not rebuild compilers',
        default: false,
      }),
    (args) => handleRebuildTestsCommand(args),
  )
}