import fs from 'node:fs';
import { ymdhms } from "../libs/utils";
import { Contract } from "../models/contract";
import { ContractPath, ContractService } from "./contract.service";
import { IProcesorService } from './processor.service';
import { IDownloadService } from './download.service';
import { validateConfig, validateInput } from '../libs/contract.validation';

/**
 * Subtype of
 * @type {import('@octokit/openapi-types').components["schemas"]["diff-entry"]}
 */
export interface PullRequestFile {
  /**
   * Relative filename of the file in the pull request
   */
  filename: string;

  /**
   * The kind of mutation made to the file
   */
  status: "added" | string;

  /**
   * Download URL for the file
   * (may require redirect to actually download)
   */
  // eslint-disable-next-line camelcase
  raw_url: string;
}

/**
 * If contract verification is successful then new metadata for the contracts
 * will be generated. Expect the metadata to be committed to a new branch
 * and a pull request to be created with that new branch as the head and
 * main branch as the base
 */
export interface PullRequestServiceOptions {
  /**
   * Filename to save the new branch name to which the metadata should be
   * committed
   *
   * @example "/tmp/ethvm-pr-name"
   */
  outBranchNameFile?: string;

  /**
   * Filename to save the new commit name in which the metadata should be
   * committed
   *
   * @example "/tmp/ethvm-commit-title"
   */
  outCommitTitleFile?: string;

  /**
   * 
   * Filename to save the new pull-request name in which the metadata should be
   * pulled into the main branch
   *
   * @example "/tmp/ethvm-pr-name"
   */
  outPrNameFile?: string;

  /**
   * Filename to save the new pull-request body in for the pull-request with
   * verified contracts and metadata
   *
   * @example "/tmp/ethvm-body"
   */
  outBodyFile?: string;

  /**
   * Save verified metadata to the filesystem
   */
  save?: boolean;

}

export class PullRequestService {
  constructor(
    private readonly contractService: ContractService,
    private readonly processorService: IProcesorService,
    private readonly downloadService: IDownloadService,
  ) {
    //
  }

  /**
   * Validate contracts added in a pull request
   *
   * @param files   pull request files
   * @param options
   * @returns       resolves if successful
   * @throws        if the pull request doesn't follow the rules
   */
  async process(
    files: PullRequestFile[],
    options?: PullRequestServiceOptions,
  ): Promise<void> {
    const {
      outBodyFile,
      outBranchNameFile,
      outCommitTitleFile,
      outPrNameFile,
      save,
    } = options ?? {};

    const additions: PullRequestFile[] = []
    const nonAdditions: PullRequestFile[] = [];
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

    // parse additions
    const { chains, unmatched } = this
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

    // download and validate each contract
    const contracts: Contract[] = [];
    for (const chainMatch of chains.values()) {
      for (const contractMatch of chainMatch.contracts.values()) {
        // download the input and config files
        // eslint-disable-next-line prefer-destructuring
        const dirname = contractMatch.dirname;

        console.info(`[${ymdhms()}] creating config dir ${dirname}`);
        await fs.promises.mkdir(dirname, { recursive: true });

        // download config
        const configFilename = contractMatch.configFilename!;
        const configFile = fileMap.get(configFilename)!;
        const configUrl = configFile.raw_url;
        console.info(`[${ymdhms()}] downloading config`
          + `  chainId=${contractMatch.chainId}`
          + `  address=${contractMatch.address}`
          + `  url=${configUrl}`
          + `  filename=${configFilename}`
        );
        await this.downloadService.file(configUrl, configFilename);

        // download input
        const inputFilename = contractMatch.inputFilename!;
        const inputFile = fileMap.get(inputFilename)!;
        const inputUrl = inputFile.raw_url;
        console.info(`[${ymdhms()}] downloading input`
          + `  chainId=${contractMatch.chainId}`
          + `  address=${contractMatch.address}`
          + `  url=${inputUrl}`
          + `  filename=${inputFilename}`
        );
        await this.downloadService.file(inputUrl, inputFilename);

        const contract = await this
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
        validateConfig(contract, await contract.storage.getConfig());

        // validate the input
        validateInput(contract, await contract.storage.getInput());

        // all good!
        contracts.push(contract);
      }
    }

    // verify contracts & save results
    await this
      .processorService
      .process(
        contracts,
        { save, concurrency: 1, failFast: true },
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
}
