import { getOctokit } from "@actions/github";
import { ValidateGitDiffsCliArgs } from "./validate-git-diffs.types";
import { getGitDiffs } from "../../libs/git-diffs";
import { processContracts } from "../../libs/contracts.process";
import { getDiffs } from "../../libs/diffs";
import { bootstrap } from "../../bootstrap";
import { MatchedChains, MatchedContract } from "../../services/contract.service";

/**
 * Execution the `validate` command
 *
 * Validate the contracts that have been added in the BASE ref
 * of the repo that don't yet exist in the HEAD repo
 *
 * @param args
 */
export async function handleValidateGitDiffsCommand(
  args: Required<ValidateGitDiffsCliArgs>,
): Promise<void> {
  const {
    base,
    head,
    owner,
    repo,
    strict,
    verify,
    verbose,
  } = args;

  const token = args.token ?? process.env.GITHUB_TOKEN;

  if (!token) {
    const msg = 'You must either provide a --token argument or set the' +
      ' GITHUB_TOKEN environment varialbe';
    throw new Error(msg);
  }

  const services = await bootstrap();

  const client = getOctokit(token);

  console.info(`repo: ${strict}`);
  console.info(`repo: ${repo}`);
  console.info(`owner: ${owner}`);
  console.info(`base: ${base}`);
  console.info(`head: ${head}`);

  const diffs = await getGitDiffs(client, {
    base,
    head,
    owner,
    repo
  });

  if (verbose) {
    console.info('diffs:', diffs);
  }

  if (!strict) console.info('loose mode');

  if (strict) {
    // assert: only changes were additions
    const nonAdditionFilenames = handleValidateGitDiffsCommand
      .getNonAdditions(diffs)
    if (nonAdditionFilenames.length) {
      const msg = 'diffs can only contain additions, found non-additions:' +
        `\n  ${nonAdditionFilenames.join('\n  ')}`;
      throw new Error(msg);
    }

    console.info(`✔️ strict: no non-additions`);
  }

  const additions = diffs.added;

  const chains = services
    .contractService
    .parseContractFilenames(additions);

  if (strict) {
    // assert: only contract-like files allowed
    const nonContractLikeFilenames = handleValidateGitDiffsCommand
      .getNonContractLikeFilenames(additions, chains);
    if (nonContractLikeFilenames.length) {
      const msg = 'diffs can only contain contract-like files,' +
        ` found non-contracts:\n  ${nonContractLikeFilenames.join('\n  ')}`;
      throw new Error(msg);
    }

    console.info(`✔️ strict: no non-contract-like filenames`);
  }

  // assert: no contract-like but unknown files
  if (strict) {
    const unknownContractLikeFilenames = handleValidateGitDiffsCommand
      .getUnknownContractLikeFilenames(additions, chains);
    if (unknownContractLikeFilenames.length) {
      const msg = 'diffs can only contain valid contract-like files,'  +
        ` found contracts:\n  ${unknownContractLikeFilenames.join('\n  ')}`;
      throw new Error(msg);
    }

    console.info(`✔️ strict: no unknown contract-like filenames`);
  }

  if (strict) {
    // assert: no files without inputs or configs
    const withoutConfigOrInput = handleValidateGitDiffsCommand
      .getContractsWithoutConfigOrInput(chains);
    if (withoutConfigOrInput) {
      const msg = 'each new contract must include a config and input' +
        ', found the following missing either config or input:' +
        `\n  ${withoutConfigOrInput.flatMap(cntr => cntr.files).join('\n  ')}`;
      throw new Error(msg);
    }

    console.info(`✔️ strict: all new contracts have config and input`);
  }

  // looks good

  if (!verify) {
    console.info('skipping verification');
    return;
  }

  // validate all
  let contractCount = 0;
  chains.forEach(chain => { contractCount += chain.contracts.size });

  if (!contractCount) {
    console.info('no contracts to verify');
    return;
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
    { failFast: true, save: false, skip: false },
  );

  console.info('✔️ success: all contracts validated');
}


/**
 * Extract added files
 * 
 * Optionally throw if there were any any modifications other than file
 * additions
 */
handleValidateGitDiffsCommand.getNonAdditions = (
  diffs: getDiffs.Diffs
): string[] => {
  const additions = new Set(diffs.added);
  const nonAdditions = diffs.all.filter(filename => !additions.has(filename));
  return nonAdditions;
}


/**
 * Assert that the filenames are all contained in the parsed contract-like files
 * 
 * @param filenames       filenames to check exist
 * @param chains          result of parsing filenames
 * @returns               trure iff all filenames were parsed
 */
handleValidateGitDiffsCommand.getNonContractLikeFilenames = (
  filenames: string[],
  chains: MatchedChains,
): string[] => {
  const parsedFilenames = new Set(Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .flatMap(contract => contract.files)));

  return filenames.filter(filename => !parsedFilenames.has(filename));
}


/**
 * Assert that all of the filenames are known contract files
 * 
 * @param filenames       filenames to check exist
 * @param chains          result of parsing filenames
 * @returns               trure iff every filename was known
 */
handleValidateGitDiffsCommand.getUnknownContractLikeFilenames = (
  filenames: string[],
  chains: MatchedChains,
): string[] => {
  const unknownFilenames = new Set(Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .flatMap(contract => contract.unknownFiles)));

  return filenames.filter(filename => unknownFilenames.has(filename));
}


/**
 * Get contracts whose files didn't include a config or input
 * 
 * @param chains 
 * @returns 
 */
handleValidateGitDiffsCommand.getContractsWithoutConfigOrInput = (
  chains: MatchedChains,
): MatchedContract[] => {
  const withoutConfig = Array
    .from(chains.values())
    .flatMap(chain => Array
      .from(chain.contracts.values())
      .filter(contract => !contract.hasConfig || !contract.hasInput));

  return withoutConfig;
}
