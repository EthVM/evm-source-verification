import { getOctokit } from "@actions/github";
import { ValidateGitDiffsCliArgs } from "./validate-git-diffs.types";
import { getGitDiffs } from "../../libs/git-diffs";
import { processContracts } from "../../libs/contracts.process";
import { getDiffs } from "../../libs/diffs";
import { matchContractFiles } from "../../libs/contracts.match";
import { bootstrap } from "../../bootstrap";

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
    token,
    base,
    head,
    owner,
    repo,
    strict
  } = args;

  const services = await bootstrap();

  const client = getOctokit(token);

  console.info(`base: ${base}`);
  console.info(`head: ${head}`);


  const diffs = await getGitDiffs(client, {
    base,
    head,
    owner,
    repo
  });

  const additions = validateDiffs(diffs, {
    onlyAddedFiles: !!strict,
  })

  const chains = matchContractFiles(
    additions,
    services.contractService,
    {
      noUnknownContractFiles: !!strict,
      onlyContractLikeFiles: !!strict,
      requireConfigFile: !!strict,
      requireInputFile: !!strict,
    },
  );

  await processContracts(
    chains,
    services,
    { save: false, failFast: true, skip: false, },
  );

  // got here? success!
}


export interface ValidateGitDiffsOptions {
  onlyAddedFiles?: boolean;
}

/**
 * Extract added files
 * 
 * Optionally throw if there were any any modifications other than file
 * additions
 */
export function validateDiffs(
  diffs: getDiffs.Diffs,
  options?: ValidateGitDiffsOptions,
): string[] {
  const onlyAddedFiles = options?.onlyAddedFiles ?? false;

  if (onlyAddedFiles) {
    // strict mode: only additions are allowed
    if (diffs.all.length !== diffs.added.length) {
      const msg = 'Strict: diffs contain more than additions';
      throw new Error(msg);
    }
  }

  return diffs.added;
}