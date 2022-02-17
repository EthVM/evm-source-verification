import chalk from 'chalk';
import { components } from '@octokit/openapi-types';
import { getOctokit } from "@actions/github";
import { PullContractsCliArgs } from "./pull-contracts.types";
import { bootstrap } from "../../bootstrap";
import { MAX_GIT_DIFF_FILES } from '../../constants';
import { logger } from '../../logger';

const log = logger.child({});

/**
 * Executes the `pull-contracts` command
 *
 * Download, validate and verify contracts from a pull request
 *
 * TODO: tests
 *
 * @param args
 */
export async function pullContractsCommand(
  args: PullContractsCliArgs,
): Promise<void> {
  const {
    base,
    head,
    owner,
    repo,
    outBodyFile,
    outBranchNameFile,
    outCommitTitleFile,
    outPrNameFile,
  } = args;

  log.info(`repo:   ${repo}`);
  log.info(`owner:  ${owner}`);
  log.info(`base:   ${base}`);
  log.info(`head:   ${head}`);

  const services = await bootstrap();

  // assert token
  const token = args.token ?? process.env.GITHUB_TOKEN;
  if (!token) {
    const msg = 'You must either provide a --token argument or set the' +
      ' GITHUB_TOKEN environment varialbe';
    throw new Error(msg);
  }

  log.info(`${chalk.green('✔')} fetching changes from GitHub`);

  // get changed files from GitHub
  const client = getOctokit(token!);
  const gres = await client.rest.repos.compareCommits({ base, head, owner, repo});

  const files: components["schemas"]["diff-entry"][] = gres.data.files ?? [];

  log.info(`git diff ${files.length} files` +
    ` ${owner}:${repo} : ${head} -> ${base}`);

  log.info(files
    .map((file, i) => `  ${i + 1}. ${file
      .status
      .padStart(6, ' ')}: ${file.filename}`)
    .join('\n'));

  // assert: not too many files
  if (files.length > MAX_GIT_DIFF_FILES)
    throw new Error(`too many git files to process: ${files.length}`);

  await services
    .pullRequestService
    .process(files, {
      save: true,
      outBodyFile,
      outBranchNameFile,
      outCommitTitleFile,
      outPrNameFile,
    })
}

