import path from 'node:path';
import { Mutex } from 'async-mutex';
import { arrObjPush, arrPush, fabs, readJsonFile, writeJsonFile } from '../libs/utils';
import { Address, ContractIdentity, HasChainId, HashList } from "../types";
import { DirCache } from '../libs/dir-cache';

/**
 * Provides access to the persistant state of the application
 */
export interface IStateService {
  /**
   * Register that the compiler has been used
   * 
   * @param identity        chain the compiler was used for
   * @param compilerName    name of the compiler
   * @returns               whether the compiler was newly registered
   */
  addUsedCompiler(
    identity: HasChainId,
    compilerName: string,
  ): Promise<boolean>;


  /**
   * Store the runtime hash of the contract
   *
   * @param identity  info specifying the contract
   * @param hash      runtime hash
   * @returns         whether the hash was newly added
   */
  addRuntimeHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean>;


  /**
   * Store the opcode hash of the contract
   *
   * @param identity  info specifying the contract
   * @param hash      opcode hash
   * @returns         whether the hash was newly added
   */
  addOpcodeHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean>;

  /**
   * Store the metaless hash of the contract
   *
   * @param identity  info specifying the contract
   * @param hash      metealess hash
   * @returns         whether the hash was newly added
   */
  addMetalessHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean>;

  /**
   * Register the contract as "verified"
   *
   * @param identity  info specifying the contract
   * @returns         whether the contract was newly registered
   */
  addVerifiedContract(
    identity: ContractIdentity,
  ): Promise<boolean>;
}


export interface StateServiceOptions {
  /**
   * directory with each chain's state info
   *
   * eg. "state"
   */
  dirname?: string,

  /**
   * basename part of the used-compilres filename
   *
   * eg. "compilers.json"
   */
  usedCompilersBasename?: string,

  /**
   * basename part of the verified-lists filename
   *
   * eg. "hash.verified.json"
   */
  verifiedBasename?: string,

  /**
   * basename part of the metaless-hashes filename
   *
   * eg. "hash.metaless.json"
   */
  metalessBasename?: string,

  /**
   * basename part of the opcode-hashes filename
   *
   * eg. "hash.opcode.json"
   */
  opcodesBasename?: string,

  /**
   * basename part of the runtime-hashes filename
   *
   * eg. "hash.runtime.json"
   */
  runtimeBasename?: string,
}


/**
 * @inheritdoc
 */
export class StateService implements IStateService {
  public static DEFAULTS = {
    DIRNAME: 'state',
    USED_COMPILERS_BASENAME: 'compilers.json',
    VERIFIED_BASENAME: 'verified.json',
    METALESS_BASENAME: 'hash.metaless.json',
    OPCODES_BASENAME: 'hash.opcode.json',
    RUNTIME_BASENAME: 'hash.runtime.json',
  }


  /**
   * Absolute directory name with the application's state
   * 
   * @see StateServiceOptions.dirname
   */
  public readonly dirname: string;


  /**
   * @see StateServiceOptions.usedCompilersBasename
   */
  public readonly usedCompilersBasename: string;


  /**
   * @see StateServiceOptions.verifiedBasename
   */
  public readonly verifiedBasename: string;


  /**
   * @see StateServiceOptions.metalessBasename
   */
  public readonly metalessBasename: string;


  /**
   * @see StateServiceOptions.opcodesBasename
   */
  public readonly opcodesBasename: string;


  /**
   * @see StateServiceOptions.runtimeBasename
   */
  public readonly runtimeBasename: string;


  // TODO: per-chain locking


  /**
   * Locks the used-compiler file while editing
   */
  private readonly compilerMutex = new Mutex();


  /**
   * Locks the verified-list file while editing
   */
  private readonly verifiedMutex = new Mutex();


  /**
   * Locks the metaless-hashes file while editing
   */
  private readonly metalessMutex = new Mutex();


  /**
   * Locks the opcode-hashes file while editing
   */
  private readonly opcodeMutex = new Mutex();


  /**
   * Locks the runtime-hashes file while editing
   */
  private readonly runtimeMutex = new Mutex();


  /**
   * @param options   configuration of the StateService
   * @param dircache  directory cache of the StateService
   *                  helps in concurrent execution
   */
  constructor(
    options?: StateServiceOptions,
    private readonly dircache: DirCache = new DirCache(),
  ) {
    this.dirname = fabs(options?.dirname
      ?? StateService.DEFAULTS.DIRNAME);

    this.usedCompilersBasename = options?.usedCompilersBasename
      ?? StateService.DEFAULTS.USED_COMPILERS_BASENAME;

    this.verifiedBasename = options?.verifiedBasename
      ?? StateService.DEFAULTS.VERIFIED_BASENAME;

    this.metalessBasename = options?.metalessBasename
      ?? StateService.DEFAULTS.METALESS_BASENAME;

    this.opcodesBasename = options?.opcodesBasename
      ?? StateService.DEFAULTS.OPCODES_BASENAME;

    this.runtimeBasename = options?.runtimeBasename
      ?? StateService.DEFAULTS.RUNTIME_BASENAME;
  }

  /** {@link IStateService.addUsedCompiler} */
  addUsedCompiler(
    identity: HasChainId,
    compilerName: string,
  ): Promise<boolean> {
    return this.compilerMutex.runExclusive(async () => {
      const filename = this.usedCompilersFilename(identity);
      const compilers = (await readJsonFile<string[]>(filename)) ?? [];
      if (!arrPush(compilers, compilerName)) return false;
      await this.dircache.ensureOf(filename);
      await writeJsonFile(filename, compilers.sort(), { pretty: true });
      return true;
    });
  }


  /** {@link IStateService.addRuntimeHash} */
  addRuntimeHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean> {
    return this.runtimeMutex.runExclusive(async () => {
      const filename = this.runtimeHashesFilename(identity);
      await this.dircache.ensureOf(filename);
      const hashes = (await readJsonFile<HashList>(filename)) ?? {};
      if (!arrObjPush(hashes, hash, identity.address)) return false;
      await writeJsonFile(filename, hashes, { pretty: true, });
      return true;
    });
  }


  /** {@link IStateService.addOpcodeHash} */
  addOpcodeHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean> {
    return this.opcodeMutex.runExclusive(async () => {
      const filename = this.opcodeHashesFilename(identity);
      await this.dircache.ensureOf(filename);
      const hashes = (await readJsonFile<HashList>(filename)) ?? {};
      if (!arrObjPush(hashes, hash, identity.address)) return false;
      await writeJsonFile(filename, hashes, { pretty: true, });
      return true;
    });
  }


  /** {@link IStateService.addMetalessHash} */
  addMetalessHash(
    identity: ContractIdentity,
    hash: string,
  ): Promise<boolean> {
    return this.metalessMutex.runExclusive(async () => {
      const filename = this.metalessHashesFilename(identity);
      await this.dircache.ensureOf(filename);
      const hashes = (await readJsonFile<HashList>(filename)) ?? {};
      if (!arrObjPush(hashes, hash, identity.address)) return false;
      await writeJsonFile(filename, hashes, { pretty: true, });
      return true;
    });
  }


  /** {@link IStateService.addVerifiedContract} */
  addVerifiedContract(
    identity: ContractIdentity,
  ): Promise<boolean> {
    return this.verifiedMutex.runExclusive(async () => {
      const filename = this.verifiedListFilename(identity);
      await this.dircache.ensureOf(filename);
      const addresses = (await readJsonFile<Address[]>(filename)) ?? [];
      if (!arrPush(addresses, identity.address)) return false;
      await writeJsonFile(filename, addresses, { pretty: true, });
      return true;
    });
  }


  /**
   * Get the filename of of the used compilers
   * 
   * @param opts  chain identifier
   * @returns     used compilers filename
   */
  usedCompilersFilename(opts: HasChainId): string {
    return path.join(
      this.dirname,
      opts.chainId.toString(),
      this.usedCompilersBasename,
    )
  }


  /**
   * Get the filename of the verified contracts list
   * 
   * @param opts  chain identifier
   * @returns     verified contracts list filename
   */
  verifiedListFilename(opts: HasChainId): string {
    return path.join(
      this.dirname,
      opts.chainId.toString(),
      this.verifiedBasename,
    )
  }


  /**
   * Get the filename for metaless hashes
   * 
   * @param opts  chain identifier
   * @returns     metaless hashes filename
   */
  metalessHashesFilename(opts: HasChainId): string {
    return path.join(
      this.dirname,
      opts.chainId.toString(),
      this.metalessBasename,
    )
  }


  /**
   * Get the filename for opcode hashes
   * 
   * @param opts  chain identifier
   * @returns     opcode hashes filename
   */
  opcodeHashesFilename(opts: HasChainId): string {
    return path.join(
      this.dirname,
      opts.chainId.toString(),
      this.opcodesBasename,
    )
  }


  /**
   * Get the filename for runtime hashes
   * 
   * @param opts  chain identifier
   * @returns     runtime hashes filename
   */
  runtimeHashesFilename(opts: HasChainId): string {
    return path.join(
      this.dirname,
      opts.chainId.toString(),
      this.runtimeBasename,
    )
  }
}