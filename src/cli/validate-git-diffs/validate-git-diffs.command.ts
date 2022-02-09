import { handleValidateGitDiffsCommand } from './validate-git-diffs.handler';
import { Command } from '../../types';
import { ValidateGitDiffsCliArgs } from './validate-git-diffs.types';

/**
 * Register the `validate` command
 *
 * @param argv
 */
export const registerValidateGitDiffsCommand: Command = (argv) => {
  argv.command<ValidateGitDiffsCliArgs>(
    "validate-git-diffs",
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

      .positional('--strict', {
        type: 'boolean',
        default: false,
        desc: 'Throw if anything other than contracts have been mutated (added'
          + ', modified, deleted',
      },)

      .positional('--verify', {
        type: 'boolean',
        default: false,
        desc: 'Throw if anything other than contracts have been mutated (added'
          + ', modified, deleted',
      },)

      .positional('--verbose', {
        type: 'boolean',
        default: false,
        desc: 'Verbose logging',
      },)

      .demandOption('--save-additions')
      .positional('--save-additions', {
        type: 'boolean',
        default: false,
        desc: 'If verification passes, save added files to this file location',
      },)
    ,
    async (args) => {
      const token = args.token ?? process.env.GITHUB_TOKEN;
      if (!token) throw new TypeError('--token or env.GITHUB_TOKEN is required');
      await handleValidateGitDiffsCommand({ ...args, token });
    },
  )
}