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

      .positional('--out-body-file', {
        type: 'string',
        desc: 'File to place the verified addresses for use in a PR or comment body',
      },)

      .positional('--out-pr-name-file', {
        type: 'string',
        desc: 'File to put the name of a new PR to accept the verified contracts',
      },)

      .positional('--out-branch-name-file', {
        type: 'string',
        desc: 'File to put the name of a new branch to host the verified contracts',
      },)

      .positional('--out-commit-title', {
        type: 'string',
        desc: 'File to put the name of a new commit with verified contracts',
      },)


    ,
    async (args) => {
      const token = args.token ?? process.env.GITHUB_TOKEN;
      if (!token) throw new TypeError('--token or env.GITHUB_TOKEN is required');
      await pullContractsCommand({ ...args, token });
    },
  )
}