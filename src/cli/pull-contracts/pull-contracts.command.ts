import { pullContractsCommand } from './pull-contracts.handler';
import { Command } from '../../types';
import { PullContractsCliArgs } from './pull-contracts.types';

/**
 * Register the `validate` command
 *
 * @param argv
 */
export const registerPullContractsCommand: Command = (argv) => {
  argv.command<PullContractsCliArgs>(
    "pull-contracts",
    "description <todo>",
    args => args
      .positional('--token', {
        type: 'string',
        desc: 'GitHub token',
        // can be loaded from environment
        // to not set process.env.GITHUB_TOKEN as default value or it will
        // print in help message
        demandOption: false,
      },)

      .demandOption('--repo')
      .positional('--repo', {
        type: 'string',
        desc: 'Repository being compared',
      },)

      .demandOption('--owner')
      .positional('--owner', {
        type: 'string',
        desc: 'User/organisation that owns the Repository',
      },)

      .demandOption('--base')
      .positional('--base', {
        type: 'string',
        desc: 'Source being compared from (eg source of a Pull Request)',
      },)

      .demandOption('--head')
      .positional('--head', {
        type: 'string',
        desc: 'Destination being compared to (eg destination of a Pull Request)',
      },)

      .demandOption('--require-contracts')
      .positional('--require-contracts', {
        type: 'boolean',
        default: false,
        desc: 'Error if no contracts are added',
      },)
    ,
    async (args) => {
      const token = args.token ?? process.env.GITHUB_TOKEN;
      if (!token) throw new TypeError('--token or env.GITHUB_TOKEN is required');
      await pullContractsCommand({ ...args, token });
    },
  )
}