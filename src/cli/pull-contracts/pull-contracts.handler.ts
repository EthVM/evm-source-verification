import fs from 'node:fs';
import path from 'node:path';
import { getOctokit } from "@actions/github";
import { PullContractsCliArgs } from "./pull-contracts.types";
import { processContracts } from "../../libs/contracts.process";
import { getDiffs2 } from "../../libs/diffs";
import { bootstrap } from "../../bootstrap";
import { MatchedChains, MatchedContract } from "../../services/contract.service";
import { downloadFile } from '../../libs/utils';

/**
 * Execution the `validate` command
 *
 * Validate the contracts that have been added in the BASE ref
 * of the repo that don't yet exist in the HEAD repo
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
    requireContracts,
    outputVerifiedAddresses,
  } = args;

  console.info(`repo: ${repo}`);
  console.info(`owner: ${owner}`);
  console.info(`base: ${base}`);
  console.info(`head: ${head}`);

  const services = await bootstrap();

  const token = args.token ?? process.env.GITHUB_TOKEN;

  if (!token) {
    const msg = 'You must either provide a --token argument or set the' +
      ' GITHUB_TOKEN environment varialbe';
    throw new Error(msg);
  }

  const client = getOctokit(token!);
  const gres = await client.rest.repos.compareCommits({ base, head, owner, repo});
  const diffs = getDiffs2(gres.data.files || []);

  console.info('diffs:', diffs);

  // assert: only changes were additions
  const nonAdditionFilenames = pullContractsCommand
    .getNonAdditions(diffs)
  if (nonAdditionFilenames.size) {
    const msg = 'diffs can only contain additions, found non-additions:' +
      `\n  ${Array
        .from(nonAdditionFilenames.keys())
        .join('\n  ')}`;
    throw new Error(msg);
  }

  console.info(`✔️ no non-additions`);

  // eslint-disable-next-line prefer-destructuring
  const addedFiles = diffs.added;
  const additionsFilenames = Array.from(diffs.added.keys());

  const chains = services
    .contractService
    .parseContractFilenames(additionsFilenames);

  // assert: only contract-like files allowed
  const nonContractLikeFilenames = pullContractsCommand
    .getNonContractLikeFilenames(addedFiles, chains);
  if (nonContractLikeFilenames.size) {
    const msg = 'diffs can only contain contract-like files,' +
      ` found non-contracts:\n  ${Array
        .from(nonContractLikeFilenames.keys())
        .join('\n  ')}`;
    throw new Error(msg);
  }

  console.info(`✔️ no non-contract-like filenames`);

  // assert: no contract-like but unknown files
  const unknownContractLikeFilenames = pullContractsCommand
    .getUnknownContractLikeFilenames(addedFiles, chains);
  if (unknownContractLikeFilenames.size) {
    const msg = 'diffs can only contain valid contract-like files,'  +
      ` found unknown contract files:\n  ${Array
        .from(unknownContractLikeFilenames.keys())
        .join('\n  ')}`;
    throw new Error(msg);
  }

  console.info(`✔️ no unknown contract-like filenames`);

  // assert: no files without inputs or configs
  const withoutConfigOrInput = pullContractsCommand
    .getContractsWithoutConfigOrInput(chains);
  if (withoutConfigOrInput.length) {
    const msg = 'each new contract must include a config and input' +
      ', found the following missing either config or input:' +
      `\n  ${withoutConfigOrInput.flatMap(cntr => cntr.files).join('\n  ')}`;
    throw new Error(msg);
  }

  console.info(`✔️ all new contracts have config and input`);

  // validate all
  let contractCount = 0;
  chains.forEach(chain => { contractCount += chain.contracts.size });
  if (requireContracts && !contractCount) {
    throw new Error('No contracts added');
  }

  // do verify
  // download new contracts into the correct directories
  for (const [addedFilename, addedFile] of addedFiles.entries()) {
    await fs.promises.mkdir(path.dirname(addedFilename), { recursive: true });
    const url = addedFile.raw_url;
    console.debug('downloading contract file:' +
      `\n  from: "${url}"` +
      `\n  to: ${addedFilename}`);
    await downloadFile(url, addedFilename);
    console.log(`finished downloading: "${addedFilename}"`);
  }

  const contractDirnames = Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .flatMap(contract => contract.dirname));

  console.info(`verifying ${contractCount} contracts:`
    + `\n  ${contractDirnames
      .map((contractDirname, idx) => `${idx + 1}. ${contractDirname}`)
      .join('\n  ')}`);

  await processContracts(
    chains,
    services,
    { failFast: true, save: true, skip: false },
  );

  console.info(`✔️ success: ${contractCount} contracts validated`);

  if (outputVerifiedAddresses) {
    // <chainId>.<address>,<address> <chainId><address>...
    const commaSeparatedContracts = Array
      .from(chains.values())
      .map(chain => `${chain.id}.${Array
        .from(chain.contracts.values())
        .map(contract => contract.address)
        .join(',')}`
      )
      .join(' ')


    console.info(`saving processed contracts` +
      `\n  to: "${outputVerifiedAddresses}"` +
      `\n  content: ${commaSeparatedContracts}`)

    await fs.promises.writeFile(outputVerifiedAddresses, commaSeparatedContracts);
  }
}


/**
 * Extract added files
 * 
 * Optionally throw if there were any any modifications other than file
 * additions
 */
pullContractsCommand.getNonAdditions = (
  diffs: getDiffs2.Diffs2
): getDiffs2.Entries => {
  const additions = new Set(diffs.added.keys());
  const nonAdditions = new Map(Array
    .from(diffs.all.entries())
    .filter(([filename]) => !additions.has(filename)));
  return nonAdditions;
}


/**
 * Assert that the filenames are all contained in the parsed contract-like files
 * 
 * @param filenames       filenames to check exist
 * @param chains          result of parsing filenames
 * @returns               trure iff all filenames were parsed
 */
pullContractsCommand.getNonContractLikeFilenames = (
  diffs: getDiffs2.Entries,
  chains: MatchedChains,
): getDiffs2.Entries => {
  const parsedFilenames = new Set(Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .flatMap(contract => contract.files)));

  const nonContractLikeFiles = new Map(Array
    .from(diffs.entries())
    .filter(([filename]) => !parsedFilenames.has(filename)));

  return nonContractLikeFiles;
}


/**
 * Assert that all of the filenames are known contract files
 * 
 * @param filenames       filenames to check exist
 * @param chains          result of parsing filenames
 * @returns               trure iff every filename was known
 */
pullContractsCommand.getUnknownContractLikeFilenames = (
  diffs: getDiffs2.Entries,
  chains: MatchedChains,
): getDiffs2.Entries => {
  const unknownFilenames = new Set(Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .flatMap(contract => contract.unknownFiles)));

  const unknownContractLikeFiles = new Map(Array
    .from(diffs.entries())
    .filter(([filename]) => unknownFilenames.has(filename)));

  return unknownContractLikeFiles;
}


/**
 * Get contracts whose files didn't include a config or input
 * 
 * @param chains 
 * @returns 
 */
pullContractsCommand.getContractsWithoutConfigOrInput = (
  chains: MatchedChains,
): MatchedContract[] => {
  const withoutConfig = Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .filter(contract => !contract.hasConfig || !contract.hasInput));

  return withoutConfig;
}
