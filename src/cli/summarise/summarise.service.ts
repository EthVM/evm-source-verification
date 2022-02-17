import fs from 'node:fs';
import path from 'node:path';
import { toPercentage } from "@nkp/percentage";
import {
  mapGetOrCreate,
  arrObjPush,
  arrPush,
  eng,
  sortKeys,
  writeJSONFile,
  fabs,
  frel,
} from "../../libs/utils";
import { logger } from "../../logger";
import { Address, ChainId, HashList } from "../../types";
import { Contract } from '../../models/contract';

const log = logger.child({});

export interface ChainState {
  runtimeHashes: HashList;
  opcodeHashes: HashList;
  metalessHashes: HashList;
  usedCompilers: string[];
  verifiedContracts: Address[];
}

export type ChainStates = Map<ChainId, ChainState>;

export interface SummariseServiceOptions {
  /**
   * Absolute directory name for the summary
   * 
   * @example "/home/.../evm-source-verification/summary"
   */
  dirname?: string;

  /**
   * Basename of the runtimeHashes filename
   * 
   * @example "hash.runtime.json"
   */
  runtimeHashesBasename?: string;

  /**
   * Basename of the opcodeHashes filename
   * 
   * @example "hash.opcodes.json"
   */
  opcodeHashesBasename?: string;

  /**
   * Basename of the metalessHashes filename
   * 
   * @example "hash.metaless.json"
   */
  metalessHashesBasename?: string;

  /**
   * Basename of the used-compilers filename
   * 
   * @example "compilers.json"
   */
  usedCompilersBasename?: string;

  /**
   * Basename of the verified filename
   * 
   * @example "verified.json"
   */
  verifiedBasename?: string;
}

/**
 * Encapsulates testable parts of the summarise command
 */
export class SummariseService {
  /**
   * Default option values for SummariseService
   */
  static readonly DEFAULTS = {
    DIRNAME: 'summary',
    RUNTIME_HASHES_BASENAME: 'hash.runtime.json',
    OPCODE_HASHES_BASENAME: 'hash.opcodes.json',
    METALESS_HASHES_BASENAME: 'hash.metaless.json',
    USED_COMPILERS_BASENAME: 'compilers.json',
    VERIFIED_BASENAME: 'verified.json',
  }

  /**
   * Absolute directory name for the summary
   * 
   * @example "/home/.../evm-source-verification/summary"
   */
  public readonly dirname: string;

  /**
   * Basename of the runtimeHashes filename
   * 
   * @example "hash.runtime.json"
   */
  public readonly runtimeHashesBasename: string;

  /**
   * Basename of the opcodeHashes filename
   * 
   * @example "hash.opcodes.json"
   */
  public readonly opcodeHashesBasename: string;

  /**
   * Basename of the metalessHashes filename
   * 
   * @example "hash.metaless.json"
   */
  public readonly metalessHashesBasename: string;

  /**
   * Basename of the used-compilers filename
   * 
   * @example "compilers.json"
   */
  public readonly usedCompilersBasename: string;

  /**
   * Basename of the verified filename
   * 
   * @example "verified.json"
   */
  public readonly verifiedBasename: string;

  /**
   * Create a new SummariseService
   *
   * @param options   configuration options
   */
  constructor(options?: SummariseServiceOptions,) {
    this.dirname = fabs(options?.dirname
      ?? SummariseService.DEFAULTS.DIRNAME);

    this.runtimeHashesBasename = options?.runtimeHashesBasename
      ?? SummariseService.DEFAULTS.RUNTIME_HASHES_BASENAME;

    this.opcodeHashesBasename = options?.opcodeHashesBasename
      ?? SummariseService.DEFAULTS.OPCODE_HASHES_BASENAME;

    this.metalessHashesBasename = options?.metalessHashesBasename
      ?? SummariseService.DEFAULTS.METALESS_HASHES_BASENAME;

    this.usedCompilersBasename = options?.usedCompilersBasename
      ?? SummariseService.DEFAULTS.USED_COMPILERS_BASENAME;

    this.verifiedBasename = options?.verifiedBasename
      ?? SummariseService.DEFAULTS.VERIFIED_BASENAME;
  }

  /**
   * Extract state from contracts
   *
   * @param contracts     contracts to extract state from
   * @returns             extracted state
   */
  // eslint-disable-next-line class-methods-use-this
  async extract(contracts: Contract[]): Promise<ChainStates> {
    const chains = new Map<ChainId, ChainState>();
    const LOG_EVERY = 500;
    log.info('extracting metadata');
    const total = contracts.length;
    let i = 0;
    for (const contract of contracts) {
      i += 1;
      const metadata = await contract.getMetadata();
      const {
        address,
        chainId,
      } = contract;
      const {
        runtimeHash,
        opcodeHash,
        compiler,
        metalessHash,
      } = metadata;

      const chain = mapGetOrCreate(chains, chainId, () => ({
        runtimeHashes: Object.create(null),
        opcodeHashes: Object.create(null),
        metalessHashes: Object.create(null),
        usedCompilers: [],
        verifiedContracts: [],
      }));

      arrObjPush(chain.runtimeHashes, runtimeHash, address);
      arrObjPush(chain.opcodeHashes, opcodeHash, address);
      arrObjPush(chain.metalessHashes, metalessHash, address);
      arrPush(chain.usedCompilers, compiler);
      arrPush(chain.verifiedContracts, address);

      if ((i % LOG_EVERY) === 0) {
        log.info(`extracting metadata...` +
          `  ${eng(i)}/${eng(total)}` +
          `  ${toPercentage(i/total)}`);
      }
    }

    // sort all chains
    log.info('sorting metadata...');
    for (const chain of chains.values()) {
      chain.runtimeHashes = sortKeys(chain.runtimeHashes);
      chain.opcodeHashes = sortKeys(chain.opcodeHashes);
      chain.metalessHashes = sortKeys(chain.metalessHashes);
      chain.usedCompilers = chain.usedCompilers.sort();
      chain.verifiedContracts = chain.verifiedContracts.sort();
      Object.values(chain.runtimeHashes).forEach(addrList => addrList.sort());
      Object.values(chain.opcodeHashes).forEach(addrList => addrList.sort());
      Object.values(chain.metalessHashes).forEach(addrList => addrList.sort());
    }

    return chains;
  }

  /**
   * Save state to the system
   *
   * @param chains      chains whose states to save
   * @returns           resolves after finished saving
   */
  async save(chains: ChainStates): Promise<void> {
    log.info('saving metadata...');
    for (const [chainId, chain] of chains.entries()) {
      // save
      const dirname = path.join(this.dirname, chainId.toString());
      const runtimeFilename = path.join(dirname, 'hash.runtime.json')
      const opcodesFilename = path.join(dirname, 'hash.opcodes.json')
      const metalessFilename = path.join(dirname, 'hash.metaless.json');
      const compilersFilename = path.join(dirname, 'compilers.json');
      const verifiedFilename = path.join(dirname, 'verified.json');

      log.info(`creating ${frel(dirname)}`);
      await fs.promises.mkdir(dirname, { recursive: true });

      const {
        runtimeHashes,
        opcodeHashes,
        metalessHashes,
        usedCompilers,
        verifiedContracts
      } = chain;

      log.info(`saving ${frel(runtimeFilename)}`);
      await writeJSONFile(runtimeFilename, runtimeHashes);

      log.info(`saving ${frel(opcodesFilename)}`);
      await writeJSONFile(opcodesFilename, opcodeHashes);

      log.info(`saving ${frel(metalessFilename)}`);
      await writeJSONFile(metalessFilename, metalessHashes);

      log.info(`saving ${frel(compilersFilename)}`);
      await writeJSONFile(compilersFilename, usedCompilers);

      log.info(`saving ${frel(verifiedFilename)}`);
      await writeJSONFile(verifiedFilename, verifiedContracts);
    }

    log.info('done');
  }
}