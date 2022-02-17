import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { toPercentage } from "@nkp/percentage";
import { Result } from "@nkp/result";
import chalk from 'chalk';
import { asyncQueue, ResultHandler, WorkCtx, WorkHandler } from "../libs/async-queue";
import { getMetadata } from "../libs/metadata";
import { eng, interpolateColor } from "../libs/utils";
import { Contract } from "../models/contract";
import { IStateService } from "./state.service";
import { VerificationService, VerifyContractResult } from "./verification.service";
import { ICompilerService } from './compiler.service';
import { logger } from '../logger';

const log = logger.child({});

export interface IProcesorService {
  /**
   * Compile, validate and optionally save metadata for all contracts
   * in parallel
   *
   * @param contracts   contracts to process
   * @param options     processing options
   * @returns           resolves after completion
   */
  process(
    contracts: Contract[],
    options: ParallelProcessorOptions,
  ): Promise<void>;
}

export interface ParallelProcessorProcessOptions {
  skip?: boolean;
  jump?: number;
}

export interface ParallelProcessorResultOptions {
  failFast?: boolean;
  save?: boolean;
}

export interface ParallelProcessorOptions extends
  ParallelProcessorProcessOptions,
  ParallelProcessorResultOptions {
  concurrency?: number;
}

/**
 * Coordinates processing of contracts
 */
export class ProcessorService implements IProcesorService {
  constructor(
    private stateService: IStateService,
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
    contracts: Contract[],
    options: ParallelProcessorOptions,
  ): Promise<void> {
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

    // does work in the queue
    const handlers: WorkHandler<Contract, ProcessResult>[] = [];
    for (let i = 0; i < _concurrency; i += 1) {
      handlers.push((ctx) => this.handleContract(ctx, options))
    }

    // receives results from the queue
    const resultHandler: ResultHandler<Contract, ProcessResult> = (
      result,
      ctx
    ) => this.handleResult(result, ctx, options);

    const start = performance.now();

    await asyncQueue<Contract, ProcessResult>(
      contracts,
      handlers,
      resultHandler,
    )

    const end = performance.now();
    const delta = Math.round(end - start);

    log.info(`finished processing` +
      ` ${eng(contracts.length)} contracts` +
      ` ${eng(delta)}ms`
    );
  }

  /**
   * Handle the processing of a contract in the queue
   * 
   * @param ctx       queue contxt
   * @param options   processsing options
   * @returns         result of processing
   */
  private async handleContract(
    ctx: WorkCtx<Contract>,
    options?: ParallelProcessorProcessOptions,
  ): Promise<ProcessResult> {
    const { index, item: contract } = ctx;
    const { skip, jump } = options ?? {};

    // jump over
    if (jump != null && index < jump) {
      // jump over this contract
      return ProcessResult.jump();
    }

    // skip
    if (skip) {
      // check if metadata already exists
      const hasMetadata = await contract.storage.hasMetadata();
      // skip this contract
      if (hasMetadata) return ProcessResult.skipped();
    }

    const [config, input] = await Promise.all([
      await contract.storage.getConfig(),
      await contract.storage.getInput(),
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

  /**
   * Process contract results
   * 
   * @param result    result of contract processing
   * @param ctx       queue context
   * @param options   options
   * @returns         error if the queue should stop
   */
  private async handleResult(
    result: Result<ProcessResult, Error>,
    ctx: WorkCtx<Contract>,
    options: ParallelProcessorResultOptions,
  ): Promise<undefined | Error> {
    const { failFast, save, } = options;

    const { index, total, item: contract } = ctx;

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
      `  ${`${eng(index)}/${eng(total)}`}` +
      `  ${toPercentage(index / total)}` +
      `  ${contract.name}`
    ;

    if (Result.isSuccess(result)) {
      // handle success

      const output = result.value;
      if (ProcessResult.isSkipped(output)) {
        // handle skipped
        const msg = `${chalk.magenta('⇢ skipped')}  ${idCtx}`;
        log.info(msg);
      }

      else if (ProcessResult.isJump(output)) {
        // handle skipped
        const msg = `${chalk.magenta('↷ jumped')}  ${idCtx}`;
        log.info(msg);
      }

      else if (ProcessResult.isUnverified(output)) {
        // handle unverified
        const msg = `${chalk.red('x unverified')}  ${idCtx}`;
        await this
          .stateService
          .addLog(contract, 'unverified', msg);
        if (failFast) return new Error(msg);
        log.warn(msg);
      }

      else if (ProcessResult.isVerified(output)) {
        // handle verified
        const msg = `${chalk.green('✔')}  ${idCtx}`;
        // success
        log.info(msg);
        if (save) {
          const metadata = getMetadata(output.verification);
          await contract.storage.saveMetadata(metadata);
        }
      }
    }

    else {
      // handle error
      const err = result.value;
      const msg = `${chalk.red('x err')}` +
        `  ${idCtx}` +
        `  ${err.toString()}`;
      await this.stateService.addLog(contract, 'error', msg);
      if (failFast) return new Error(msg);
      log.warn(msg);
    }
  }
}

export type ProcessResult =
  | ProcessResult.Skipped
  | ProcessResult.Jump
  | ProcessResult.Verified
  | ProcessResult.Unverified
;

export namespace ProcessResult {
  // eslint-disable-next-line no-shadow
  export enum Type { Skipped, Jump, Verified, Unverified, }

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

