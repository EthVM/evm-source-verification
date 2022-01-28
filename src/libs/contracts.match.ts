// TODO: resolve circular import
// eslint-disable-next-line import/no-cycle
import { IContractService } from "../services/contract.service";
import { Address, ContractFileMatch } from "../types";

export type MatchedChains = Map<number, MatchedChain>;

export type MatchedContracts = Map<Address, MatchedContract>

export interface MatchedChain {
  id: number;
  contracts: MatchedContracts;
}

interface MatchedContract {
  address: Address;
  dir: string;
  hasConfig: boolean;
  hasInput: boolean;
  hasMetadata: boolean;
  files: string[]
  unknownFiles: string[]
}

export interface MatchContractFileOptions
  extends ParseFilesOptions, ParseMatchesOptions {}

/**
 * Validate, parse and transform chains and contracts from added files from a
 * git diff
 *
 * Optionally throw if the additions contain anything except what was strictly
 * expected
 * 
 * @param additions 
 * @param contractService 
 * @param options 
 * @returns 
 */
export function matchContractFiles(
  additions: string[],
  contractService: IContractService,
  options: MatchContractFileOptions,
): MatchedChains {
  const contracts = parseFiles(additions, contractService, options);
  const chains = parseMatches(contracts, contractService, options);
  return chains;
}


export interface ParseFilesOptions {
  onlyContractLikeFiles?: boolean
}

/**
 * Extract contact files & their identifying info
 * 
 * Optionally throw if there were any additions other than CONTRACT
 * additions
 * 
 * @param files 
 * @param contractService 
 * @param options 
 * @returns 
 */
function parseFiles(
  files: string[],
  contractService: IContractService,
  options?: ParseFilesOptions,
): ContractFileMatch[] {
  const onlyContractLikeFiles = options?.onlyContractLikeFiles ?? false;

  // get the details of added files
  const matches: ContractFileMatch[] = [];
  const nonMatches: string[] = [];

  for (const file of files) {
    const match = contractService.match(file);
    if (!match) nonMatches.push(file)
    else matches.push(match);
  }

  if (onlyContractLikeFiles && nonMatches.length) {
    // eslint-disable-next-line prefer-template
    const msg = 'onlyContractLikeFiles: found files that are not contracts:' +
      '\n  ' + nonMatches.join('\n  ');
    throw new Error(msg);
  }

  return matches;
}

interface ParseMatchesOptions {
  /**
   * Parsing will error if there are any unknown files in contract dirs
   */
  noUnknownContractFiles?: boolean;

  /**
   * Parsing will error if there is NO input file
   */
  requireInputFile?: boolean;

  /**
   * Parsing will error if there is NO config file
   */
  requireConfigFile?: boolean;

  /**
   * Parsing will error if there is a metadata file
   */
  requireNoMetadataFile?: boolean;
}

/**
 * Extract info of chains contracts
 *
 * Throws if any contracts are missing files
 *
 * Optionally throw unless *only* valid contracts were added and nothing more
 *
 * @param contractMatches 
 * @param contractService 
 * @param options 
 */
function parseMatches(
  contractMatches: ContractFileMatch[],
  contractService: IContractService,
  options?: ParseMatchesOptions,
): MatchedChains {
  const requireConfigFile = options?.requireConfigFile ?? false;
  const requireInputFile = options?.requireInputFile ?? false;
  const requireNoMetadataFile = options?.requireNoMetadataFile ?? false;
  const noUnknownContractFiles = options?.noUnknownContractFiles ?? false;

  // extract all chains and contracts from the diffs
  const chains: MatchedChains = new Map();
  for (const contractMatch of contractMatches) {
    const { address, chainId, dir, original, subpath, } = contractMatch;

    // lazily get the chain
    let chain = chains.get(chainId);
    if (!chain) {
      chain = { id: chainId, contracts: new Map(), }
      chains.set(chainId, chain);
    }

    // lazily get the contract
    let contract = chain.contracts.get(address);
    if (!contract) {
      contract = {
        dir,
        address,
        hasConfig: false,
        hasInput: false,
        hasMetadata: false,
        files: [],
        unknownFiles: [],
      };
      chain.contracts.set(address, contract);
    }

    // add the file parsed from the diff
    contract.files.push(original);
    switch (subpath) {
      case `/${contractService.configBasename}`:
        contract.hasConfig = true;
        break;
      case `/${contractService.inputBasename}`:
        contract.hasInput = true;
        break;
      case `/${contractService.metadataBasename}`:
        contract.hasMetadata = true;
        break;
      default:
        contract.unknownFiles.push(subpath);
        break;
    }
  }

  // TODO: separate parsing from validating
  // parse and THEN optionally throw on the results
  // instead of mixing together in the same function

  if (noUnknownContractFiles) {
    // strict mode: only config.json & input.json allowed
    const invalid: string[] = []
    for (const chain of chains.values()) {
      for (const contract of chain.contracts.values()) {
        if (contract.unknownFiles.length) {
          invalid.push(...contract.unknownFiles);
        }
      }
    }

    // throw any unxpected files
    if (invalid.length) {
      const msg = `Strict: unexpected contract files added:` +
        `\n  ${invalid.join('\n  ')}`;
      throw new Error(msg);
    }
  }

  // ensure all chains HAVE config and input files
  // do any contracts contain files other than config & input?
  const missing: string[] = []
  for (const chain of chains.values()) {
    for (const contract of chain.contracts.values()) {
      // must have config.json
      if (requireConfigFile && !contract.hasConfig){ 
        const msg = `chain=${chain.id} contract=${contract.address}`
          + ` is missing a ${contractService.configBasename} file`;
        missing.push(msg);
      }

      // must have input.json
      if (requireInputFile && !contract.hasInput){ 
        const msg = `chain=${chain.id} contract=${contract.address}`
          + ` is missing a ${contractService.inputBasename} file`;
        missing.push(msg);
      }

      // must not have a metadata.json
      if (requireNoMetadataFile && !contract.hasMetadata){ 
        const msg = `chain=${chain.id} contract=${contract.address}`
          + ` should not have a ${contractService.metadataBasename} file`;
        missing.push(msg);
      }
    }
  }

  // throw any unxpected files
  if (missing.length) {
    const msg = `found missing files while parsing diffs:` +
      `\n  ${missing.join('\n  ')}`;
    throw new Error(msg);
  }
    
  return chains;
}