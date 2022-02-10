import { Result } from '@nkp/result';
import fs from 'node:fs';
import path from 'node:path';
// TODO: resolve circular import
// eslint-disable-next-line import/no-cycle
import { fabs, fexists, toBN, writeJSONFile } from "../libs/utils";
import {
  ContractConfig,
  ContractInput,
  ContractIdentity,
  HasChainId,
  VerifiedMetadata,
  Address,
} from "../types";


/**
 * Contract info extractable from a filename
 */
export interface ContractFileMatch {
  /**
   * Everything in the path after the address
   * contracts/:chainid/:address/:subpath
   */
  subpath: string;
  original: string;
  chainId: number;
  address: string;
  dir: string;
}


/**
 * Many chains from parsed filenames
 */
export type MatchedChains = Map<number, MatchedChain>;


/**
 * Many contracts from parsed filenames
 */
export type MatchedContracts = Map<Address, MatchedContract>


/**
 * Chain from parsed filenames
 */
export interface MatchedChain {
  id: number;
  contracts: MatchedContracts;
}


/**
 * Contract from parsed filenames
 */
export interface MatchedContract {
  address: Address;
  dirname: string;
  hasConfig: boolean;
  hasInput: boolean;
  hasMetadata: boolean;
  files: string[]
  unknownFiles: string[]
}


/**
 * Provides access to contracts
 */
export interface IContractService {
  /**
   * Basename of a config file
   *
   * @example "config.json"
   */
  readonly configBasename: string,


  /**
   * Basename of an input file
   *
   * @example "input.json"
   */
  readonly inputBasename: string;


  /**
   * Basename of a metadata file
   *
   * @example "metadata.json"
   */
  readonly metadataBasename: string;


  /**
   * Get all saved contracts
   *
   * @returns           all contracts for all chains
   */
  getContracts(): Promise<MatchedChains>


  /**
   * Get all saved for the chain
   *
   * @param identity    identity of the chain
   * @returns           all contracts the chain
   */
  getChainContracts(identity: HasChainId): Promise<MatchedContracts>


  /**
   * Save contract metadtata
   *
   * @param identity    info specifying the contract
   * @param metadata    the metadata to save
   */
  saveMetadata(identity: ContractIdentity, metadata: VerifiedMetadata): Promise<void>;


  /**
   * Does the contract have compiler config stored?
   *
   * @param identity    info specifying the contract
   * @returns           whether the contract has a config file
   */
  hasConfig(identity: ContractIdentity): Promise<boolean>;


  /**
   * Does the contract have compiler input stored?
   *
   * @param identity    info specifying the contract
   * @returns           whether the contract has an input file
   */
  hasMetadata(identity: ContractIdentity): Promise<boolean>;


  /**
   * Does the contract have a metadata stored?
   *
   * @param identity    info specifying the contract
   * @returns           whether the contract has a metadata file
   */
  hasMetadata(identity: ContractIdentity): Promise<boolean>;


  /**
   * Get the JSON Config of the contract
   *
   * @param identity  info specifying the contract
   */
  getConfig(identity: ContractIdentity): Promise<ContractConfig>;


  /**
   * Get the JSON Input of the contract
   *
   * @param identity  info specifying the contract
   */
  getInput(identity: ContractIdentity): Promise<ContractInput>;


  /**
   * Extract info specifying the contract from a file or directory path
   *
   * @param filename    file or dir name with the contract
   * @returns           contract info if match was successful
   */
  match(filename: string): null | ContractFileMatch;


  /**
   * Match and parse contract filenames
   *
   * Extracts contract identifying data and collects files into their
   * similar chains and contracts
   *
   * @param filenames     filenames to match and parse
   * @returns             chains & contracts matched from the filenames
   */
  parseContractFilenames(filenames: string[]): MatchedChains


  /**
   * Ensure a contract config is valid
   * 
   * @param identity 
   * @param config 
   */
  validateConfig(identity: ContractIdentity, config: ContractConfig): void;


  /**
   * Ensure a contract input is valid
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
   * Absolute directory name of the application's contracts
   *
   * @see ContractServiceOptions.dirname
   *
   * @private
   */
  public readonly dirname: string;


  /**
   * @see ContractServiceOptions.configBasename
   *
   * @private
   */
  public readonly configBasename: string;


  /**
   * @see ContractServiceOptions.inputBasename
   *
   * @private
   */
  public readonly inputBasename: string;


  /**
   * @see ContractServiceOptions.metadataBasename
   *
   * @private
   */
  public readonly metadataBasename: string;


  /**
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


  /** @see IContractService.getContracts */
  async getContracts(): Promise<MatchedChains> {
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

    const matches = this.parseContractFilenames(addressDirnames);

    return matches;
  }


  /** @see IContractService.getChainContracts */
  async getChainContracts(
    identity: HasChainId,
  ): Promise<MatchedContracts> {
    const chainDir = this.getChainDirname(identity);

    const dirs = await fs
      .promises
      .readdir(
        chainDir,
        { withFileTypes: true }
      )

    const dirnames = dirs.map(dir => path.join(chainDir, dir.name));

    const matches = this.parseContractFilenames(dirnames);

    const contracts: MatchedContracts = matches
      .get(identity.chainId)
      ?.contracts ?? new Map();

    return contracts;
  }


  /** @see IContractService.saveMetadata */
  async saveMetadata(
    identity: ContractIdentity,
    metadata: VerifiedMetadata,
  ): Promise<void> {
    await writeJSONFile(
      this.getMetadataFilename(identity),
      metadata,
      { pretty: true },
    );
  }


  /** @see IContractService.hasMetadata} */
  hasMetadata(identity: ContractIdentity): Promise<boolean> {
    return fexists(this.getMetadataFilename(identity));
  }


  /** @see IContractService.hasConfig} */
  hasConfig(identity: ContractIdentity): Promise<boolean> {
    return fexists(this.getConfigFilename(identity));
  }


  /** @see IContractService.hasInput} */
  hasInput(identity: ContractIdentity): Promise<boolean> {
    return fexists(this.getInputFilename(identity));
  }


  /** @see IContractService.getConfig} */
  getConfig(identity: ContractIdentity): Promise<ContractConfig> {
    const configFilename = this.getConfigFilename(identity);
    return fs
      .promises
      .readFile(fabs(configFilename))
      // TODO: assert file contains valid utf-8
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }


  /** @see IContractService.getInput */
  getInput(identity: ContractIdentity): Promise<ContractInput> {
    const inputFilename = this.getInputFilename(identity);
    return fs
      .promises
      .readFile(fabs(inputFilename))
      // TODO: assert file contains valid utf-8
      .then(buf => buf.toString('utf-8'))
      .then(JSON.parse.bind(JSON));
  }


  /** @see IContractService.match */
  match(str: string): null | ContractFileMatch {
    const { dirname } = this;
    const regex = new RegExp(`^(${dirname}\\/([0-9]+)\\/(0x[a-f0-9]{40}))(\\/.*|$)`);
    const rmatch = str.match(regex);
    if (!rmatch) return null;
    const [, rdir, rchainId, raddress, rsubpath] = rmatch;
    return {
      original: str,
      dir: rdir,
      chainId: rchainId.startsWith('0x')
        ? parseInt(rchainId, 16)
        : parseInt(rchainId, 10),
      address: raddress,
      subpath: rsubpath,
    }
  }

  /** @see IContractService.parseContractFilenames */
  parseContractFilenames(filenames: string[]): MatchedChains {
    const matches: ContractFileMatch[] = [];

    for (const filename of filenames) {
      const match = this.match(filename);
      if (match) matches.push(match);
    }

    // extract all chains and contracts from the diffs
    const chains: MatchedChains = new Map();
    for (const match of matches) {
      const { address, chainId, dir, original, subpath, } = match;

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
          dirname: dir,
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
        case `/${this.configBasename}`:
          contract.hasConfig = true;
          break;
        case `/${this.inputBasename}`:
          contract.hasInput = true;
          break;
        case `/${this.metadataBasename}`:
          contract.hasMetadata = true;
          break;
        default:
          contract.unknownFiles.push(original);
          break;
      }
    }

    return chains;
  }


  /** @see IContractService.validateConfig */
  // eslint-disable-next-line class-methods-use-this
  validateConfig(identity: ContractIdentity, config: ContractConfig): void {
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


  /** @see IContractService.validateInput */
  // eslint-disable-next-line class-methods-use-this
  validateInput(identity: ContractIdentity, input: ContractInput): void {
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
  getChainDirname(identity: HasChainId): string {
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
  getAddressDirname(options: ContractIdentity): string {
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
  getConfigFilename(identity: ContractIdentity): string {
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
  getInputFilename(identity: ContractIdentity): string {
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
  getMetadataFilename(identity: ContractIdentity): string {
    return path.join(
      this.getAddressDirname(identity),
      this.metadataBasename,
    );
  }
}
