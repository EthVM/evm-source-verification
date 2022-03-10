import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { inspect } from 'node:util';
import { performance } from 'node:perf_hooks';
import { toPercentage } from "@nkp/percentage";
import { Result } from "@nkp/result";
import { kv } from '@nkp/kv';
import chalk from 'chalk';
import { asyncQueue, ResultHandler, WorkCtx, WorkHandler } from "../libs/async-queue";
import { getMetadata } from "../libs/metadata";
import { eng, frel, hasOwn, interpolateColor, ymdhms } from "../libs/utils";
import { IContract } from "../models/contract";
import { VerificationService, VerifyContractResult } from "./verification.service";
import { logger, LOGS_DIRNAME } from '../logger';
import { CompilationError } from '../errors/compilation.error';
import { CompilerNotFoundError } from '../errors/compiler-not-found.error';
import { CompilerNotSupportedError } from '../errors/compiler-not-supported.error';
import { MAX_CONTRACT_WORKAHEAD } from '../constants';
import { ICompilerService } from '../interfaces/compiler.service.interface';
import { IProcesorService, ParallelProcessorOptions, ProcessorHandleOptions, ProcessorResultOptions, ProcessorStats } from '../interfaces/processor.service.interface';

const log = logger.child({});

/**
 * Coordinates processing of contracts
 */
export class ProcessorService implements IProcesorService {
  /**
   * Create a new ProcessorService
   * 
   * @param compilerService         handles compilation of a contract
   * @param verificationService     handles verification of a compile contract
   */
  constructor(
    private compilerService: ICompilerService,
    private verificationService: VerificationService,
  ) {
    //
  }

  /**
   * Compile, validate and optionally save metadata for all contracts
   * in parallel
   *
   * @param contracts   contracts to process
   * @param options     processing options
   * @returns           resolves after completion
   */
  async process(
    contracts: IContract[],
    options: ParallelProcessorOptions,
  ): Promise<ProcessorStats> {
    const {
      concurrency,
      failFast,
      jump,
      save,
      skip,
    } = options;

    // determine concurrency
    const _concurrency = concurrency ?? 1;
    if (!Number.isFinite(_concurrency)) {
      throw new Error(`Concurrency must be a number.` +
        ` Given: ${String(_concurrency)}`);
    }

    if (_concurrency > os.cpus().length) {
      const msg = `concurrency ${chalk.red(_concurrency)} is` +
        ` greater than the` +
        ` number of cpus ${chalk.green(os.cpus().length)}.` +
        `\n  Concurrency will be limited by` +
        ` the number of cpus.` +
        `\n  Consider lowering concurrency to ` +
        ` ${chalk.green(os.cpus().length)}.`;
      log.warn(msg);
    }

    log.info(`processing` +
      ` ${eng(contracts.length)} contracts` +
      `  failFast=${chalk.green(failFast ?? false)}` +
      `  save=${chalk.green(save ?? false)}` +
      `  jump=${chalk.green(jump ?? 0)}` +
      `  skip=${chalk.green(skip ?? false)}` +
      `  concurrency=${chalk.green(_concurrency)}`);

    const stats: ProcessorStats = {
      ok: {
        jumped: [],
        skipped: [],
        verified: [],
      },
      err: {
        errored: [],
        failed: [],
        noCompiler: [],
        unsupported: [],
        unverified: [],
      },
    };

    // create queue item handlers
    const handlers: WorkHandler<IContract, ProcessResult>[] = [];
    for (let i = 0; i < _concurrency; i += 1) {
      handlers.push((ctx) => this.handleContract(ctx, options))
    }

    // create queue result handler
    const resultHandler: ResultHandler<IContract, ProcessResult> =
      createResultHandler(stats, options);

    // begin work
    const start = performance.now();
    await asyncQueue<IContract, ProcessResult>(
      contracts,
      handlers,
      resultHandler,
      MAX_CONTRACT_WORKAHEAD,
    )
    const end = performance.now();
    const delta = Math.round(end - start);


    // report on queue results
    const statsReport: string[] = [];
    for (const [name, okContracts] of Object.entries(stats.ok)) {
      if (!okContracts.length) continue;
      statsReport.push(`${chalk.green(name)}=${okContracts.length}`);
    }
    for (const [name, errdContracts] of Object.entries(stats.err)) {
      if (!errdContracts.length) continue;
      statsReport.push(`${chalk.red(name)}=${errdContracts.length}`);
    }
    log.info(`finished processing` +
      ` ${chalk.green(eng(contracts.length))} contracts` +
      ` in ${chalk.green(`${eng(delta)}`)}ms` +
      ` @ ${chalk.green(eng(1000 * contracts.length / delta))} contracts per second` +
      `, ${chalk.green(`${eng(delta / contracts.length)}`)}ms per contract`
    )
    log.info(`results  ${statsReport.join('  ')}`);
    if (Object.values(stats.err).some(errContracts => errContracts.length)) {
      log.info(`for more information see "${['.', frel(LOGS_DIRNAME)].join(path.sep)}"`);
    }

    return stats;
  }

  /**
   * Handle the processing of a contract in the queue
   * 
   * @param ctx       queue contxt
   * @param options   processsing options
   * @returns         result of processing
   */
  private async handleContract(
    ctx: WorkCtx<IContract>,
    options?: ProcessorHandleOptions,
  ): Promise<ProcessResult> {
    const { index, item: contract } = ctx;
    const { skip, jump } = options ?? {};

    // log.info(`processing  chainId=${ctx.item.chainId}  address=${ctx.item.address}`);

    // jump over
    if (jump != null && index < jump) {
      // jump over this contract
      return ProcessResult.jump();
    }

    // skip
    if (skip) {
      // check if metadata already exists
      const hasMetadata = await contract.hasMetadata();
      // skip this contract
      if (hasMetadata) {
        return ProcessResult.skipped();
      }
    }

    const [config, input] = await Promise.all([
      await contract.getConfig(),
      await contract.getInput(),
    ]);

    const out = await this
      .compilerService
      .compile(config, input)

    const verification = await this
      .verificationService
      .verify(out, config)

    const {
      isOpCodeVerified,
      isRuntimeVerified,
    } = verification;

    if (!isRuntimeVerified && !isOpCodeVerified) {
      return ProcessResult.unverified();
    }

    return ProcessResult.verified(verification);
  }
}

/**
 * Create a result handler to receive results from the queue
 * 
 * @param result    result of contract processing
 * @param ctx       queue context
 * @param options   options
 * @returns         error if the queue should stop
 */
// eslint-disable-next-line class-methods-use-this
function createResultHandler(
  stats: ProcessorStats,
  options: ProcessorResultOptions,
): ResultHandler<IContract, ProcessResult> {
  /**
   * Handle a result from the queue
   *
   * @param result  result from the queue
   * @param ctx     queue context
   * @returns       resolves after the item is finished being processed
   */
  return async function resultHandler (
    result: Result<ProcessResult, Error>,
    ctx: WorkCtx<IContract>,
  ): Promise<void | undefined | Error> {
    const { failFast, save, } = options;

    const { index: idx, total, item: contract } = ctx;

    const { chainId, address } = contract;

    const duration = Math.round(ctx.end! - ctx.start);

    // eslint-disable-next-line prefer-template
    const idCtx = `${contract.chainId}` +
      `  ${contract.address}` +
      `  ${interpolateColor(
          200,
          duration,
          5_000,
          eng(duration).padStart(5, ' ')
        )}ms` +
      `  ${`${eng(idx)}/${eng(total)}`}` +
      `  ${toPercentage(idx / total)}` +
      `  ${contract.name}`
    ;

    const errCtx = () => kv({ chainId, address, idx });

    const errMsg = (msg?: string) => {
      const info = errCtx();
      if (msg) return `${msg}  ${info}`;
      return info;
    }

    // handle non-error results
    if (Result.isOk(result)) {
      const output = result.value;

      if (ProcessResult.isSkipped(output)) {
        // handle skipped
        stats.ok.skipped.push(contract);
        const msg = `${chalk.magenta('⇢ skipped')}  ${idCtx}`;
        log.info(msg);
      }

      else if (ProcessResult.isJump(output)) {
        // handle skipped
        stats.ok.jumped.push(contract);
        const msg = `${chalk.magenta('↷ jumped')}  ${idCtx}`;
        log.info(msg);
      }

      else if (ProcessResult.isVerified(output)) {
        // handle verified
        stats.ok.verified.push(contract);
        const msg = `${chalk.green('✔ verified')}  ${idCtx}`;
        // success
        log.info(msg);
        if (save) {
          const metadata = getMetadata(output.verification);
          await contract.saveMetadata(metadata);
        }
      }

      else if (ProcessResult.isUnverified(output)) {
        stats.err.unverified.push(contract);
        // handle unverified
        const msg = `${chalk.red('x unverified')}  ${idCtx}`;
        await report('unverified', contract, idx);
        if (failFast) {
          const emsg = errMsg('failed to verify');
          return new Error(emsg);
        }
        log.error(msg);
      }

      else {
        // catchall
        stats.err.errored.push(contract);
        const msg = `unhandled result ${inspect(output, { colors: false })}`;
        return new Error(msg);
      }
    }

    // handle non-error results
    else {
      // processing errored
      const err = result.value as Error;

      if (err instanceof CompilationError) {
        stats.err.failed.push(contract);
        const msg = `${chalk.red('x failed')}  ${idCtx}`;
        log.error(msg);
        await report('failed', contract, idx, { err });
        if (failFast) {
          err.message += `  ${errCtx()}`;
          return err;
        }
      }

      else if (err instanceof CompilerNotFoundError) {
        stats.err.noCompiler.push(contract);
        const msg = `${chalk.red('x no-compiler')}  ${idCtx}`;
        log.error(msg);
        await report('no-compiler', contract, idx, { err });
        if (failFast) {
          err.message += `  ${errCtx()}`;
          return err;
        }
      }

      else if (err instanceof CompilerNotSupportedError) {
        stats.err.unsupported.push(contract);
        const msg = `${chalk.red('x unsupported')}  ${idCtx}`;
        log.error(msg);
        await report('unsupported', contract, idx, { err });
        if (failFast) {
          err.message += `  ${errCtx()}`;
          return err;
        }
      }

      else {
        stats.err.errored.push(contract);
        const msg = `${chalk.red('x error')}  ${idCtx}  ${err.toString()}`;
        await report('error', contract, idx, { err });
        log.error(msg);
        if (failFast) {
          err.message += `  ${errCtx()}`;
          return err;
        }
      }
    }
  }
}

/**
 * Report the failure to verify a contract
 *
 * @param contract    contract that faile verification
 * @param idx         index of the contract among all those being verified
 * @returns
 */
async function report(
  type: string,
  contract: IContract,
  // eslint-disable-next-line default-param-last
  idx = 0,
  rest?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info?: any,
    err?: Error,
  },
) {
  const { chainId, address, name } = contract;
  const filename = path.join(LOGS_DIRNAME, `${chainId}.${type}.log`);
  const config = await contract.getConfig();
  const { compiler } = config;
  let msg = `${ymdhms()}`
    + `  ${type}`
    + `  idx=${idx}`
    + `  chainId=${chainId}`
    + `  address=${address}`
    + `  name=${name}`
    + `  compiler=${compiler}`;

  if (rest && hasOwn(rest, 'info'))
    msg += `  ${inspect(rest.info, { depth: 4, colors: false })}`;

  if (rest && hasOwn(rest, 'err'))
    msg += `  err=${inspect(rest.err, { depth: 4, colors: false })}`

  if (!msg.endsWith('\n')) msg += '\n';

  await fs
    .promises
    .appendFile(filename, msg, 'utf-8');
}

export type ProcessResult =
  | ProcessResult.Skipped
  | ProcessResult.Jump
  | ProcessResult.Verified
  | ProcessResult.Unverified
;

export namespace ProcessResult {
  // eslint-disable-next-line no-shadow
  export enum Type {
    Skipped,
    Jump,
    Verified,
    Unverified,
  }

  /**
   * Skipped result
   */
  export interface Skipped {
    type: Type.Skipped;
    verification: null;
  }

  /**
   * Jumped result
   */
  export interface Jump {
    type: Type.Jump;
    verification: null;
  }

  /**
   * Verified result
   */
  export interface Verified {
    type: Type.Verified;
    verification: VerifyContractResult;
  }

  /**
   * Unverified result
   */
  export interface Unverified {
    type: Type.Unverified;
    verification: null;
  }

  /**
   * Create a new Skipped result
   * @returns Skipped result
   */
  export function skipped(): Skipped {
    return { type: Type.Skipped, verification: null, };
  }

  /**
   * Create a new Jumped result
   * @returns Jumped result
   */
  export function jump(): Jump {
    return { type: Type.Jump, verification: null, };
  }

  /**
   * Create a new Verified result
   * @returns Verified result
   */
  export function verified(verification: VerifyContractResult): Verified {
    return { type: Type.Verified, verification, };
  }

  /**
   * Create a new Unverified result
   * @returns Unverified result
   */
  export function unverified(): Unverified {
    return { type: Type.Unverified, verification: null, };
  }

  /**
   * was contract verification skipped?
   * @returns whether contract verification was skipped
   */
  export function isSkipped(result: ProcessResult): result is Skipped {
    return result.type === Type.Skipped;
  }

  /**
   * was contract verification jumped?
   * @returns whether contract verification was jumped
   */
  export function isJump(result: ProcessResult): result is Jump {
    return result.type === Type.Jump;
  }

  /**
   * was contract verification successful?
   * @returns whether contract verification was successful
   */
  export function isVerified(result: ProcessResult): result is Verified {
    return result.type === Type.Verified;
  }

  /**
   * was contract verification unsuccessful?
   * @returns whether contract verification was unsuccessful
   */
  export function isUnverified(result: ProcessResult): result is Unverified {
    return result.type === Type.Unverified;
  }
}

