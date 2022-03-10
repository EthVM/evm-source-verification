import { IContract } from "../models/contract";

export interface ProcessorHandleOptions {
  skip?: boolean;
  jump?: number;
}

export interface ProcessorResultOptions {
  failFast?: boolean;
  save?: boolean;
}

export interface ParallelProcessorOptions extends
  ProcessorHandleOptions,
  ProcessorResultOptions {
  concurrency?: number;
}

export interface ProcessorStats {
  ok: {
    verified: IContract[];
    skipped: IContract[];
    jumped: IContract[];
  };
  err: {
    failed: IContract[];
    unverified: IContract[];
    noCompiler: IContract[];
    unsupported: IContract[];
    errored: IContract[];
  };
}


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
    contracts: IContract[],
    options: ParallelProcessorOptions,
  ): Promise<ProcessorStats>;
}
