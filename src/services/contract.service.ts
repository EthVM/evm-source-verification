import { toPercentage } from '@nkp/percentage';
import fs from 'node:fs';
import path from 'node:path';
import { eng, mapGetOrCreate, toBN, toChainId, ymdhms } from "../libs/utils";
import { Contract } from '../models/contract';
import { FsContract, FsContractOptions } from '../models/contract.fs';
import { IContractStorage } from '../models/contract.storage';
import {
  ContractConfig,
  ContractInput,
  ContractIdentity,
  HasChainId,
  Address,
  ChainId,
} from "../types";


/**
 * Result of matching a single contract filename
 */
export interface ContractMatch {
  /**
   * Original matched filename
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
   * Dirname of the matched contract
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
   * Directory of the contract
   */
  dirname: string;

  /**
   * The config filename if it was matched
   */
  configFilename: null | string;

  /**
   * The input filename if it was matched
   */
  inputFilename: null | string;

  /**
   * The metadata filename if it was matched
   */
  metadataFilename: null | string;

  /**
   * Unknown files found within the contract directory
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
 * Provides access to contracts
 */
export interface IContractService {
  /**
   * Get all saved contracts
   *
   * @returns   all contracts for all chains
   */
  getContracts(): Promise<Contract[]>

  /**
   * Get all saved for the chain
   *
   * @param identity    identity of the chain
   * @returns           all contracts the chain
   */
  getChainContracts(identity: HasChainId): Promise<Contract[]>

  /**
   * Get the contract of the address
   *
   * @param identity    identity of the contract
   * @returns           the contract
   * @throws            if the contract doesn't exist
   */
  getContract(identity: ContractIdentity): Promise<Contract>

  /**
   * Hydrate many contracts from the filesystem
   *
   * @param args      fs args
   * @param options   globally shared options
   * @returns         hydrated contracts
   */
  hydrateContracts(
    args: {
      dirname: string,
      options?: Partial<FsContractOptions>,
    }[],
    options?: Partial<FsContractOptions>,
  ): Promise<Contract[]>;

  /**
   * Hydrate a new contract from the filesystem
   *
   * @param dirname     dirname of the contract
   * @param options     storage options
   * @returns           filesystem based contract
   */
  hydrateContract(
    dirname: string,
    options?: Partial<FsContractOptions>,
  ): Promise<Contract>;

  /**
   * Hydrate a new contract from the given storage
   *
   * @param storage     storage use to hydrate the contract
   * @returns           filesystem based contract
   */
  hydrateContractFrom(storage: IContractStorage): Promise<Contract>;

  /**
   * Match a contract-like filename or dirname to get it's identifying info
   * like chainId and address
   *
   * @param filename    contract-like filename or dirname
   * @returns           contract info if match was successful
   */
  matchContractFilename(filename: string): null | ContractMatch;

  /**
   * Match many contract-like filenameas and dirnames to get their identifying info
   * like chainId and address
   *
   * Groups results from similar chains and contracts together
   * 
   * @param filenames   contract-like filenames or dirnames
   * @returns           matched chains and contracts, and unmatched files
   */
  matchContractFilenames(filenames: string[]): ContractPathMatches;

  /**
   * Assert that a contract config is valid
   * 
   * @param identity 
   * @param config 
   */
  validateConfig(identity: ContractIdentity, config: ContractConfig): void;

  /**
   * Assert that a contract input is valid
   * 
   * @param identity 
   * @param input 
   */
  validateInput(identity: ContractIdentity, input: ContractInput): void;
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
 * @inheritdoc
 */
export class ContractService implements IContractService {
  public static DEFAULTS = {
    DIRNAME: 'contracts',
    CONFIG_BASENAME: 'configs.json',
    INPUT_BASENAME: 'input.json',
    METADATA_BASENAME: 'metadata.json',
  }

  /**
   * directory with the application's contracts
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
    this.dirname = options?.dirname
      ?? ContractService.DEFAULTS.DIRNAME;

    this.configBasename = options?.configBasename
      ?? ContractService.DEFAULTS.CONFIG_BASENAME;

    this.inputBasename = options?.inputBasename
      ?? ContractService.DEFAULTS.INPUT_BASENAME;

    this.metadataBasename = options?.metadataBasename
      ?? ContractService.DEFAULTS.METADATA_BASENAME;
  }

  /**
   * Get all saved contracts
   *
   * @returns   all contracts for all chains
   */
  async getContracts(): Promise<Contract[]> {
    const rootdir = this.dirname;

    // get all chain directories
    const chainDirents: fs.Dirent[] = await fs
      .promises
      .readdir(rootdir, { withFileTypes: true });

    const addressDirnames: string[] = await Promise
      .all(chainDirents.map(async chainDir => {
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
    identity: HasChainId,
  ): Promise<Contract[]> {
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
   * Get the contract of the address
   *
   * @param identity    identity of the contract
   * @returns           the contract
   * @throws            if the contract doesn't exist
   */
  async getContract(identity: ContractIdentity): Promise<Contract> {
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
      options?: Partial<FsContractOptions>,
    }[],
    options?: Partial<FsContractOptions>,
  ): Promise<Contract[]> {
    const contracts: Contract[] = []
    let i = 0;
    const total = args.length;

    console.log(`[${ymdhms()}] loading ${eng(total)} contracts...`);

    const LOG_EVERY = 1000;
    for (const arg of args) {
      i += 1;
      const contract = await this.hydrateContract(
        arg.dirname,
        { ...options, ... arg.options, },
      );

      if ((i % LOG_EVERY) === 0) {
        console.log(`[${ymdhms()}] loading contracts...` +
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
  hydrateContract(
    dirname: string,
    options?: Partial<FsContractOptions>,
  ): Promise<Contract> {
    const _options: FsContractOptions = {
      configBasename: options?.configBasename ?? this.configBasename,
      inputBasename: options?.inputBasename ?? this.inputBasename,
      metadataBasename: options?.metadataBasename ?? this.metadataBasename,
    }
    const storage = new FsContract(dirname, _options);
    return this.hydrateContractFrom(storage);
  }

  /**
   * Hydrate a new contract from the given storage
   *
   * @param storage     storage use to hydrate the contract
   * @returns           filesystem based contract
   */
  // eslint-disable-next-line class-methods-use-this
  async hydrateContractFrom(
    storage: IContractStorage,
  ): Promise<Contract> {
    const config  = await storage.getConfig();
    const { chainId, address, name } = config;
    const contract = new Contract(toChainId(chainId), address, storage, name);
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
    const regex = new RegExp(`^(${dirname}\\/([0-9]+)\\/(0x[a-f0-9]{40}))(\\/.*|$)`);
    const rmatch = filename.match(regex);
    if (!rmatch) return null;
    const [, contractDirname, chainId, address, subpath] = rmatch;
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
   * Assert that a contract config is valid
   * 
   * @param identity 
   * @param config 
   */
  // eslint-disable-next-line class-methods-use-this
  validateConfig(identity: ContractIdentity, config: ContractConfig): void {
    // TODO: better validation

    const {
      chainId,
      address,
    } = identity;

    const {
      chainId: cchainId,
      address: caddress,
      compiler: ccompiler,
      name: cname,
    } = config;

    if (!cname)
      throw new Error(`config of chainId=${chainId},` +
        ` address=${address} has no name`);

    if (!caddress)
      throw new Error(`config of chainId=${chainId},` +
        ` address=${address} has no address`);

    if (!cchainId)
      throw new Error(`config of chainId=${chainId},` +
        ` address=${address} has no chainId`);

    if (!ccompiler)
      throw new Error(`config of chainId=${chainId},` +
        ` address=${address} has no compiler`);

    // validate identity

    if (caddress !== address)
      throw new Error(`addresses of chainId=${chainId},` +
        ` address=${address} do not match`);

    if (toBN(cchainId).toNumber() !== chainId)
      throw new Error(`chainIds of of chainId=${chainId},` +
        ` address=${address} do not match`);
  }


  /**
   * Assert that a contract input is valid
   * 
   * @param identity 
   * @param input 
   */
  // eslint-disable-next-line class-methods-use-this
  validateInput(): void {
    // TODO
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
  private getChainDirname(identity: HasChainId): string {
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
  private getAddressDirname(options: ContractIdentity): string {
    return path.join(
      this.getChainDirname({ chainId: options.chainId }),
      options.address,
    );
  }

  /**
   * Get the absolute fs location of a contract's config.json
   * 
   * @param identity    contract identity
   * @returns           contract's config filename
   * 
   * @private
   */
  private getConfigFilename(identity: ContractIdentity): string {
    return path.join(
      this.getAddressDirname(identity),
      this.configBasename,
    );
  }

  /**
   * Get the absolute fs location of a contract's input.json
   * 
   * @param identity    contract identity
   * @returns           contract's input filename
   * 
   * @private
   */
  private getInputFilename(identity: ContractIdentity): string {
    return path.join(
      this.getAddressDirname(identity),
      this.inputBasename,
    );
  }


  /**
   * Get the absolute fs location of the contract's verified metadata file
   *
   * @param identity    contract identity
   * @returns           contract's metadata filename
   * 
   * @private
   */
  private getMetadataFilename(identity: ContractIdentity): string {
    return path.join(
      this.getAddressDirname(identity),
      this.metadataBasename,
    );
  }
}
