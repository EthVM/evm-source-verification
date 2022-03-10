/* eslint-disable max-classes-per-file */
import { toPercentage } from '@nkp/percentage';
import fs from 'node:fs';
import path from 'node:path';
import regExpEscape from 'escape-string-regexp';
import { eng, fabs, mapGetOrCreate, toChainId } from "../libs/utils";
import { logger } from '../logger';
import { IContract, ICreateContractOptions } from '../models/contract';
import { ContractStorage, ContractStorageOptions } from '../models/contract.storage';
import {
  IContractIdentity,
  IHasChainId,
  Address,
  ChainId,
} from "../types";

const log = logger.child({});

/**
 * Result of matching a single contract filename
 */
export interface ContractMatch {
  /**
   * Absolute path of the original filename
   */
  filename: string;

  /**
   * ChainId of the matched contract
   */
  chainId: number;

  /**
   * Address of the matched contract
   */
  address: string;

  /**
   * Absolute dirname of the matched contract
   */
  dirname: string;

  /**
   * Relative path of the file within the contract's directory
   */
  subpath: string;
}

/**
 * Single contract resulting from matching many contract filenames
 *
 * Filenames may belong to the same contract
 * 
 * Is the grouping of files belonging to a single contract
 */
export interface ContractPath {
  /**
   * ChainId of the matched contract
   */
  chainId: ChainId;

  /**
   * Address of the matchedcontract
   */
  address: Address;

  /**
   * Absolute directory of the contract
   */
  dirname: string;

  /**
   * The absolute config filename if it was matched
   */
  configFilename: null | string;

  /**
   * The absolute input filename if it was matched
   */
  inputFilename: null | string;

  /**
   * The absolute metadata filename if it was matched
   */
  metadataFilename: null | string;

  /**
   * Unknown absolute filenames found within the contract directory
   */
  unknown: string[]
}

/**
 * Chains and their contracts that were found by matching filenames
 */
export type ChainPaths = Map<ChainId, ChainPath>;

/**
 * Contracts that were found by matching filenames
 */
export type ContractPaths = Map<Address, ContractPath>

/**
 * Result of matching many contract filenames
 * 
 * Includes the matched chains and the files that did not match
 */
export interface ContractPathMatches {
  unmatched: string[]
  chains: ChainPaths;
}

/**
 * Chain from parsed filenames
 */
export interface ChainPath {
  id: number;
  contracts: ContractPaths;
}

/**
 * Configuration options for the ContractService
 */
export interface ContractServiceOptions {
  /**
   * directory with the application's contracts
   *
   * @example "contracts"
   */
  dirname?: string;

  /**
   * basename part of the compiler's config filename
   *
   * @example "config.json"
   */
  configBasename?: string;

  /**
   * basename part of the compiler's input filename
   *
   * @example "input.json"
   */
  inputBasename?: string;

  /**
   * basename part of the verified output filename
   *
   * @example "metadata.json"
   */
  metadataBasename?: string;
}

/**
 * Abstract base contract service
 *
 * Provides access to contracts in the filesystem
 *
 * Matches filesystem paths to extract contract data
 */
export abstract class BaseContractsFsService<T extends IContract = IContract> {
  public static DEFAULTS = {
    DIRNAME: 'contracts',
    CONFIG_BASENAME: 'configs.json',
    INPUT_BASENAME: 'input.json',
    METADATA_BASENAME: 'metadata.json',
  }

  /**
   * absolute directory with the application's contracts
   *
   * @example "contracts"
   */
  public readonly dirname: string;

  /**
   * basename part of the compiler's config filename
   *
   * @example "config.json"
   */
  public readonly configBasename: string;

  /**
   * basename part of the compiler's input filename
   *
   * @example "input.json"
   */
  public readonly inputBasename: string;

  /**
   * basename part of the verified output filename
   *
   * @example "metadata.json"
   */
  public readonly metadataBasename: string;

  /**
   * Create a new ContractService
   *
   * @param options   configuration of the ContractService
   */
  constructor(options?: ContractServiceOptions) {
    this.dirname = fabs(options?.dirname
      ?? BaseContractsFsService.DEFAULTS.DIRNAME);

    this.configBasename = options?.configBasename
      ?? BaseContractsFsService.DEFAULTS.CONFIG_BASENAME;

    this.inputBasename = options?.inputBasename
      ?? BaseContractsFsService.DEFAULTS.INPUT_BASENAME;

    this.metadataBasename = options?.metadataBasename
      ?? BaseContractsFsService.DEFAULTS.METADATA_BASENAME;
  }

  protected abstract createContract(options: ICreateContractOptions): T;


  /**
   * Get all saved contracts
   *
   * @returns   all contracts for all chains
   */
  async getContracts(): Promise<T[]> {
    const rootdir = this.dirname;
    // note: this could be cleaned up using a glob library

    // get all chain directories
    const chainDirents: fs.Dirent[] = await fs
      .promises
      .readdir(rootdir, { withFileTypes: true });

    const addressDirnames: string[] = await Promise
      .all(chainDirents
        .filter(dir => dir.isDirectory())
          .map(async chainDir => {
            // expand chain dirname
            const chainDirname = path.join(rootdir, chainDir.name);

            // get address dirents
            const addrDirents = await fs
              .promises
              .readdir(chainDirname, { withFileTypes: true })

            // expand address dirnames
            const addrDirnames = addrDirents.map(addrDir => path.join(
              chainDirname,
              addrDir.name,
            ));

            return addrDirnames;
          }))
      // flatten 2d chainIds-addresses
      .then((chainAddrDirnames) => chainAddrDirnames.flat());

    const contracts = await this
      .hydrateContracts(addressDirnames
        .map((dirname) => ({ dirname })));

    return contracts;
  }

  /**
   * Get all saved for the chain
   *
   * @param identity    identity of the chain
   * @returns           all contracts the chain
   */
  async getChainContracts(
    identity: IHasChainId,
  ): Promise<IContract[]> {
    const chainDirname = this.getChainDirname(identity);
    const dirs = await fs
      .promises
      .readdir(
        chainDirname,
        { withFileTypes: true }
      )

    const dirnames = dirs
      .map(dir => path
        .join(chainDirname, dir.name));

    const contracts = this
      .hydrateContracts(dirnames
        .map((dirname) => ({ dirname })));

    return contracts;
  }

  /**
   * Get the contract of the address and chainId
   *
   * @param identity    identity of the contract
   * @returns           the contract
   * @throws            if the contract doesn't exist
   */
  async getContract(identity: IContractIdentity): Promise<T> {
    const contract = await this.hydrateContract(this.getAddressDirname(identity));
    return contract;
  }

  /**
   * Hydrate many contracts from the filesystem
   *
   * @param args      fs args
   * @param options   globally shared options
   * @returns         hydrated contracts
   */
  async hydrateContracts(
    args: {
      dirname: string,
      options?: Partial<ContractStorageOptions>,
    }[],
    options?: Partial<ContractStorageOptions>,
  ): Promise<T[]> {
    const contracts: T[] = []
    let i = 0;
    const total = args.length;

    log.info(`loading ${eng(total)} contracts...`);

    const LOG_EVERY = 1000;
    for (const arg of args) {
      i += 1;
      const contract = await this.hydrateContract(
        arg.dirname,
        { ...options, ... arg.options, },
      );

      if ((i % LOG_EVERY) === 0) {
        log.info(`loading contracts...` +
          `  ${eng(i)}/${eng(total)}` +
          `  ${toPercentage(i/total)}`);
      }

      contracts.push(contract);
    }
    return contracts;
  }

  /**
   * Hydrate a new contract from the filesystem
   *
   * @param dirname     dirname of the contract
   * @param options     storage options
   * @returns           filesystem based contract
   */
  async hydrateContract(
    dirname: string,
    options?: Partial<ContractStorageOptions>,
  ): Promise<T> {
    const _options: ContractStorageOptions = {
      configBasename: options?.configBasename ?? this.configBasename,
      inputBasename: options?.inputBasename ?? this.inputBasename,
      metadataBasename: options?.metadataBasename ?? this.metadataBasename,
    }
    const storage = new ContractStorage(dirname, _options);
    const config  = await storage.getConfig();
    const { chainId, address, name } = config;
    const create: ICreateContractOptions = {
      chainId: toChainId(chainId),
      address,
      storage,
      name,
    }
    const contract = this.createContract(create);
    return contract;
  }

  /**
   * Match a contract-like filename or dirname to get it's identifying info
   * like chainId and address
   *
   * @param filename    contract-like filename or dirname
   * @returns           contract info if match was successful
   */
  matchContractFilename(filename: string): null | ContractMatch {
    const { dirname } = this;
    // this should work for paths on Windows, Linux and MacOS

    // create the regex source to match absolute contract-like filenames / dirnames
    const sourceSegs = [
      // contracts directory
      ...`^(${dirname}`.split(path.sep),
      // chainId
      '([0-9]+)',
      // address
      '(0x[a-f0-9]{40}))',
    ];

    const source = sourceSegs.join(regExpEscape(path.sep))
      // optional subpath capture groups
      + `(?:${regExpEscape(path.sep)}(.*))?$`;

    const regex = new RegExp(source);

    const filenameabs = fabs(filename);
    const rmatch = filenameabs.match(regex);

    if (!rmatch) return null;

    const [, contractDirname, chainId, address, _subpath] = rmatch;
    // if there is no subpath it will be undefined because the subpath capture group
    // is within an optional non-capture group "?:"
    const subpath = _subpath ?? '';

    return {
      filename,
      dirname: contractDirname,
      chainId: toChainId(chainId),
      address,
      subpath,
    }
  }

  /**
   * Match many contract-like filenameas and dirnames to get their identifying info
   * like chainId and address
   *
   * Groups results from similar chains and contracts together
   * 
   * @param filenames   contract-like filenames or dirnames
   * @returns           matched chains and contracts, and unmatched files
   */
  matchContractFilenames(filenames: string[]): ContractPathMatches {
    const matches: ContractMatch[] = [];
    const unmatched: string[] = [];

    for (const filename of filenames) {
      const match = this.matchContractFilename(filename);
      if (match) matches.push(match);
      else unmatched.push(filename);
    }

    // aggregate all matches
    const chains: ChainPaths = new Map();
    for (const match of matches) {
      const {
        address,
        chainId,
        dirname,
        filename,
      } = match;

      const chain: ChainPath = mapGetOrCreate(
        chains,
        chainId,
        () => ({ id: chainId, contracts: new Map(), })
      );

      const contract: ContractPath = mapGetOrCreate(
        chain.contracts,
        address,
        () => ({
          dirname,
          address,
          chainId,
          configFilename: null,
          inputFilename: null,
          metadataFilename: null,
          unknown: [],
        }),
      )

      const basepath = path.relative(match.dirname, match.filename);

      // add the file parsed from the diff
      switch (basepath) {
        case this.configBasename:
          contract.configFilename = match.filename;
          break;
        case this.inputBasename:
          contract.inputFilename = match.filename;
          break;
        case this.metadataBasename:
          contract.metadataFilename = match.filename;
          break;
        default:
          contract.unknown.push(filename);
          break;
      }
    }

    return {
      unmatched,
      chains,
    };
  }

  /**
   * Get the absolute fs directory location of a contract chain with the given
   * chainId
   * 
   * @param identity    chain's identity
   * @returns           relative contract's directory for this chain
   * 
   * @private
   */
  private getChainDirname(identity: IHasChainId): string {
    return path.join(
      this.dirname,
      identity.chainId.toString(),
    );
  }

  /**
   * Get the absolute fs directory location of a contract with the given
   * chainId and address
   * 
   * @param options   contract's identity
   * @returns         contract's relative fs directory
   * 
   * @private
   */
  private getAddressDirname(options: IContractIdentity): string {
    return path.join(
      this.getChainDirname({ chainId: options.chainId }),
      options.address,
    );
  }
}