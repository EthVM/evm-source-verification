import { performance } from 'node:perf_hooks';
import { toPercentage } from "@nkp/percentage";
import { Result } from "@nkp/result";
import { MAX_CONCURRENCY } from "../constants";
import { asyncQueue, ResultHandler, WorkCtx, WorkHandler } from "../libs/async-queue";
import { getMetadata } from "../libs/metadata";
import { eng, ymdhms } from "../libs/utils";
import { Contract } from "../models/contract";
import { IContractProcessorService } from "./contract-processor.service";
import { IStateService } from "./state.service";
import { VerifyContractResult } from "./verification.service";

export interface IParallelProcessorService {
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
export class ParallelProcessorService implements IParallelProcessorService {
  constructor(
    private contractProcessorService: IContractProcessorService,
    private stateService: IStateService,
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
    if (_concurrency > MAX_CONCURRENCY) {
      throw new Error(`concurrency must be ${MAX_CONCURRENCY}` +
        ` or less (${_concurrency})`);
    }

    console.info(`[${ymdhms()}] parallel processing` +
      ` ${eng(contracts.length)} contracts` +
      `  failFast=${failFast}` +
      `  save=${save}` +
      `  jump=${jump}` +
      `  skip=${skip}` +
      `  concurrency=${concurrency}`);

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
    console.info(`[${ymdhms()}] finished processing` +
      ` ${eng(contracts.length)} contracts` +
      `  took=${eng(Math.round(end - start))}ms`
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
    if (jump != null && jump < index) {
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

    // do processing
    const result = await this.contractProcessorService.process(contract)

    // unsuccessful
    if (!result) return ProcessResult.unverified();

    // successful
    return ProcessResult.verified(result);
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

    // eslint-disable-next-line prefer-template
    const idCtx = `chainId=${contract.chainId}` +
      `  address=${contract.address}` +
      `  ${eng(Math
          .round(ctx.end! - ctx.start))
          .padStart(5, ' ')}ms` +
      `  ${eng(index)}/${eng(total)}` +
      `  ${toPercentage(index / total)}` +
      `  ${contract.name}`
    ;

    if (Result.isSuccess(result)) {
      // handle success

      const output = result.value;
      if (ProcessResult.isSkipped(output)) {
        // handle skipped
        const msg = `[${ymdhms()}] skipped:` +
          `  ${idCtx}`;
        console.debug(msg);
      }

      else if (ProcessResult.isJump(output)) {
        // handle skipped
        const msg = `[${ymdhms()}] jumped:` +
          `  ${idCtx}`;
        console.debug(msg);
      }

      else if (ProcessResult.isUnverified(output)) {
        // handle unverified
        const msg = `[${ymdhms()}] unverified:` +
          `  ${idCtx}`;
        await this
          .stateService
          .addLog(contract, 'unverified', msg);
        if (failFast) return new Error(msg);
        console.warn(msg);
      }

      else if (ProcessResult.isVerified(output)) {
        // handle verified
        const msg = `[${ymdhms()}] verified:` +
          `  ${idCtx}`;
        // success
        console.info(msg);
        if (save) {
          const metadata = getMetadata(output.verification);
          await contract.storage.saveMetadata(metadata);
        }
      }
    }

    else {
      // handle error
      const err = result.value;
      const msg = `[${ymdhms()}] error:` +
        `  ${idCtx}` +
        `  ${err.toString()}`;
      await this.stateService.addLog(contract, 'error', msg);
      if (failFast) return new Error(msg);
      console.warn(msg);
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

