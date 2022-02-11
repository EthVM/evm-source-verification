import fs from 'node:fs';
import { components } from '@octokit/openapi-types';
import { getOctokit } from "@actions/github";
import { PullContractsCliArgs } from "./pull-contracts.types";
import { bootstrap } from "../../bootstrap";
import { ContractPath } from "../../services/contract.service";
import { downloadFile, ymdhms } from '../../libs/utils';
import { MAX_GIT_DIFF_FILES } from '../../constants';
import { Contract } from '../../models/contract';

/**
 * Execution the `pull-contracts` command
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

  console.info(`repo: ${repo}`);
  console.info(`owner: ${owner}`);
  console.info(`base: ${base}`);
  console.info(`head: ${head}`);

  const services = await bootstrap();

  // assert token
  const token = args.token ?? process.env.GITHUB_TOKEN;
  if (!token) {
    const msg = 'You must either provide a --token argument or set the' +
      ' GITHUB_TOKEN environment varialbe';
    throw new Error(msg);
  }

  console.info('✔️ fetching changes from GitHub');

  // get changed files from GitHub
  const client = getOctokit(token!);
  const gres = await client.rest.repos.compareCommits({ base, head, owner, repo});

  const files: components["schemas"]["diff-entry"][] = gres.data.files ?? [];

  console.info(`git diff ${files.length} files` +
    ` ${owner}:${repo} : ${head} -> ${base}`);

  console.info(files
    .map((file, i) => `  ${i + 1}. ${file
      .status
      .padStart(6, ' ')}: ${file.filename}`)
    .join('\n'));

  // assert: not too many files
  if (files.length > MAX_GIT_DIFF_FILES)
    throw new Error(`too many git files to process: ${files.length}`);

  console.info('✔️ extracting additions');
  const additions: components["schemas"]["diff-entry"][] = []
  const nonAdditions: components["schemas"]["diff-entry"][] = [];
  for (const file of files) {
    if (file.status === 'added') additions.push(file);
    else nonAdditions.push(file);
  }
  // assert: only additions
  if (nonAdditions.length > 0) {
    const msg = 'diffs can only contain additions' +
      `, found ${nonAdditions.length} non-additions:` +
      `\n  ${nonAdditions
          .map(file => `${file
            .status
            .padStart(8, ' ')}. ${file.filename}`)
          .join('\n  ')}`
    throw new Error(msg);
  }

  /**
   * Map of filename -> file from GitHub
   */
  const fileMap = new Map(additions.map(addition => [
    addition.filename,
    addition,
  ]));

  console.info('✔️ parsing additions');
  // parse additions
  const { chains, unmatched } = services
    .contractService
    .matchContractFilenames(additions.map(addition => addition.filename));

  // assert: no unmatched files
  if (unmatched.length) {
    throw new Error('diffs cannot contain non-contract files' +
      `, found: ${unmatched.length}:` +
      `\n  ${unmatched.join('\n  ')}`);
  }

  // assert: have matches
  if (!chains.size) {
    throw new Error('no contract files matched');
  }

  const withUnknownFiles: ContractPath[] = [];
  const withoutConfig: ContractPath[] = [];
  const withoutInput: ContractPath[] = [];
  Array
    .from(chains.values())
    .filter(chain => Array
      .from(chain.contracts.values())
      .forEach(contract => {
        if (contract.unknown.length) withUnknownFiles.push(contract);
        if (!contract.inputFilename) withoutInput.push(contract);
        if (!contract.configFilename) withoutConfig.push(contract);
      }));


  const errors: string[] = [];

  // assert: no unknown files
  if (withUnknownFiles.length) {
    errors.push(`cannot add unknown contract-like:`);
    for (const wUnknown of withUnknownFiles) {
      const msg = `  chainId=${wUnknown.chainId}` +
        `  address=${wUnknown.address}` +
        `\n  unknownFiles:` +
        `\n    ${wUnknown.unknown.join('\n    ')}`;
      errors.push(msg);
    }
  }

  // assert: no contracts WITHOUT config
  if (withoutConfig.length) {
    errors.push(`the following contracts are missing a config file`);
    for (const woConfig of withoutConfig) {
      const msg = `  chainId=${woConfig.chainId}` +
        `  address=${woConfig.address}`;
      errors.push(msg);
    }
  }

  // assert: no contracts WITHOUT input
  if (withoutInput.length) {
    errors.push(`the following contracts are missing an input file`);
    for (const woInput of withoutInput) {
      const msg = `  chainId=${woInput.chainId}` +
        `  address=${woInput.address}`;
      errors.push(msg);
    }
  }

  if (errors.length) {
    const err = errors.join('\n');
    throw new Error(err);
  }

  console.info('✔️ downloading contracts');
  // download and validate each contract
  const contracts: Contract[] = [];
  for (const chainMatch of chains.values()) {
    for (const contractMatch of chainMatch.contracts.values()) {
      // download the input and config files
      // eslint-disable-next-line prefer-destructuring
      const dirname = contractMatch.dirname;
      const configFilename = contractMatch.configFilename!;
      const inputFilename = contractMatch.inputFilename!;

      console.info(`[${ymdhms()}] creating config dir ${dirname}`);
      await fs.promises.mkdir(dirname, { recursive: true });

      // download config
      const configFile = fileMap.get(configFilename)!;
      const configUrl = configFile.raw_url;
      console.info(`[${ymdhms()}] downloading config`
        + `  chainId=${contractMatch.chainId}`
        + `  address=${contractMatch.address}`
        + `  url=${configUrl}`
        + `  filename=${configFilename}`
      );
      await downloadFile(configUrl, configFilename);

      // download input
      const inputFile = fileMap.get(inputFilename)!;
      const inputUrl = inputFile.raw_url;
      console.info(`[${ymdhms()}] downloading input`
        + `  chainId=${contractMatch.chainId}`
        + `  address=${contractMatch.address}`
        + `  url=${configUrl}`
        + `  filename=${configFilename}`
      );
      await downloadFile(inputUrl, inputFilename);

      const contract = await services
        .contractService
        .hydrateContract(contractMatch.dirname);

      // assert: chainId of json matches filesystem
      if (contract.chainId !== contractMatch.chainId) {
        const msg = `filesystem chainId=${contractMatch.chainId}` +
          ` does not match json chainId=${contract.chainId}` +
          ` (address=${contractMatch.address})`;
        throw new Error(msg);
      }

      // assert: address of json matches filesystem
      if (contract.address !== contractMatch.address) {
        const msg = `filesystem address=${contractMatch.address}` +
          ` does not match json address=${contract.address}` +
          ` (chainId=${contractMatch.chainId})`;
        throw new Error(msg);
      }

      // validate the config
      services
        .contractService
        .validateConfig(
          contract,
          await contract.storage.getConfig(),
        );

      // validate the input
      services
        .contractService
        .validateInput(
          contract,
          await contract.storage.getInput(),
        );

      // all good!
      contracts.push(contract);
    }
  }

  console.info('✔️ verifying contracts');
  // verify contracts & save results
  await services
    .parallelProcessorService
    .process(
      contracts,
      { save: true, concurrency: 1, failFast: true },
    );

  // sanity check: assert we processed the number of items expected
  const matchContractCount = Array
    .from(chains.values())
    .reduce((cnt, chain) => cnt + chain.contracts.size, 0);
  if (contracts.length !== matchContractCount) {
    const msg = 'something went wrong:' +
      `the number of verified contracts ${contracts.length} does not match` +
      `the number of contracts parsed from the fileystem ${matchContractCount}`;
    throw new Error(msg);
  }

  // success!
  console.info(`✔️ success ${contracts.length}`);

  // save results

  // random string to make branch & pr names unique
  const rand = Array
    .from(
      { length: 6 },
      () => Math.floor(16 * Math.random()).toString(16))
    .join('');

  // save filename with the name for a new branch
  if (outBranchNameFile) {
    let branchName = `verified-${contracts.length}`;
    branchName += `-${contracts[0].address.slice(0, 12)}`;
    branchName += `-${rand}`;
    console.info(`saving branch name:` +
      `\n  filename: "${outBranchNameFile}"` +
      `\n  content: ${branchName}`)
    await fs.promises.writeFile(outBranchNameFile, branchName, 'utf-8');
  }

  // save filename with the name for a new commit
  if (outCommitTitleFile) {
    let commitTitle = `verified-${contracts.length}`;
    commitTitle += `-${contracts[0].address.slice(0, 12)}`;
    commitTitle += `-${rand}`;
    console.info(`saving commit title:` +
      `\n  filename: "${outBranchNameFile}"` +
      `\n  content: ${commitTitle}`)
    await fs.promises.writeFile(outCommitTitleFile, commitTitle, 'utf-8');
  }

  // save filename with the name for a new pull request
  if (outPrNameFile) {
    let prName = `verified-${contracts.length}`;
    prName += `-${contracts[0].address.slice(0, 12)}`;
    prName += `-${rand}`;
    console.info(`saving pr name:` +
      `\n  filename: "${outBranchNameFile}"` +
      `\n  content: ${prName}`)
    await fs.promises.writeFile(outPrNameFile, prName, 'utf-8');
  }

  // save a message describing the verified contracts
  if (outBodyFile) {
    const body = Array
      .from(chains.values())
      .map(chain => `chainId: ${chain.id}, addresses: ${Array
        .from(chain.contracts.values())
        .map(contract => contract.address)
        .join(',')}`
      )
      .join('\n')
    console.info(`saving message body:` +
      `\n  filename: "${outBodyFile}"` +
      `\n  content: ${body}`)
    await fs.promises.writeFile(outBodyFile, body, 'utf-8');
  }
}
