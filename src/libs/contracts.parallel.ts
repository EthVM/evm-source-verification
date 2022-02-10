import { LinkedList } from "@nkp/linked-list";
import { toPercentage } from "@nkp/percentage";
import { Result } from "@nkp/result";
import { Mutex } from "async-mutex";
import { IServices } from "../bootstrap";
import { ContractIdentity } from "../types";
import { ContractResult, IContractProcessor } from "./contracts.processor";
import { saveContract } from "./contracts.save";
import { ymdhms } from "./utils";

type Work =
  | Work.Processing
  | Work.Done

namespace Work {
  export interface Processing {
    index: number;
    identity: ContractIdentity;
    processor: IContractProcessor;
    done: false;
    result: null;
  }
  export interface Done {
    index: number;
    identity: ContractIdentity;
    processor: null;
    done: true;
    result: Result<ContractResult, Error>;
  }
}

interface QueueOptions {
  failFast: boolean;
  save: boolean;
}

/**
 * Parallel process contracts for extreme speed
 * 
 * @param services 
 * @param options 
 * @param pending 
 * @param processors 
 * @returns 
 */
export function parallelProcessContracts(
  services: IServices,
  options: QueueOptions,
  pending: ContractIdentity[],
  processors: IContractProcessor[],
): Promise<void> {
  const { failFast, save, } = options;

  return new Promise<void>((res, rej) => {
    /**
     * have we stopped? (resolved or rejected?)
     */
    type IsStopping = false | { err: Error };
    let isStopping: IsStopping = false;

    /**
     * cursor
     */
    let cursor = 0;

    /**
     * total number of contracts to process
     */
    const total = pending.length;

    /**
     * Idle processors that are ready to process the next contract
     */
    const idle: LinkedList<IContractProcessor> = new LinkedList();

    /**
     * Queue of processing and processed-but-waiting-for-recognition items
     *
     * Preserves the same order as {@link pending}
     */
    const workQueue: Work[] = [];

    /**
     * Items waiting to be post-processed
     * 
     * Preserves the same order as {@link pending}
     */
    const completedQueue: LinkedList<Work.Done> = new LinkedList();

    /**
     * Notify lock to ensure we don't notify multiple times at once
     */
    const notifyLock = new Mutex();

    /**
     * Currently in a notifying run?
     */
    let isNotifying = false;

    const enqueueMutex = new Mutex();

    idle.push(...processors);

    const concurrency = processors.length;

    tick();

    function forceStop(err: Error) {
      console.debug(`[${ymdhms()}] stopping... ${err.toString()}`);
      isStopping = { err };
      // empty the completed queuje
      while (completedQueue.size) { completedQueue.shift(); }
    }

    /**
     * Handle all the waiting completed work
     *
     * @returns 
     */
    function complete() {
      if (isStopping) return;
      if (isNotifying) return;
      isNotifying = true;
      notifyLock.runExclusive(async () => {
        let didNotify = false;
        let completed: undefined | Work.Done;
        // eslint-disable-next-line no-cond-assign
        while ((completed = completedQueue.shift())) {
          const { identity, result, index, } = completed;

          const idCtx = `chainId=${identity.chainId}` +
            `  address=${identity.address}` +
            `  ${index}/${total}` +
            `  ${toPercentage(index / total)}`
            ;

          didNotify = true;
          if (Result.isSuccess(result)) {
            // handle success
            const output = result.value;
            if (ContractResult.isSkipped(output)) {
              // handle skipped
              const msg = `[${ymdhms()}] complete: skipped:` +
                `  ${idCtx}`;
              console.debug(msg);
            }

            else if (ContractResult.isUnverified(output)) {
              // handle unverified
              const msg = `[${ymdhms()}] complete: unverified:` +
                `  ${idCtx}`;
              await services.stateService.addLog(identity, 'unverified', msg);
              if (failFast) return void forceStop(new Error(msg));
              console.warn(msg);
            }

            else if (ContractResult.isVerified(output)) {
              // handle verified
              const msg = `[${ymdhms()}] complete: verified:` +
                `  ${idCtx}`;
              // success
              console.info(msg);
              if (save) {
                await saveContract(output.verification, identity, services);
              }
            }
          }

          else {
            // handle error
            const err = result.value;
            const msg = `[${ymdhms()}] complete: error:` +
              `  ${idCtx}` +
              `  ${err.toString()}`;
            await services.stateService.addLog(identity, 'error', msg);
            if (failFast) return void forceStop(new Error(msg));
            console.warn(msg);
          }
        }
        // unlock
        isNotifying = false;

        if (didNotify) tick();
      })
    }

    /**
     * Handle processed items
     */
    function tick() {
      // continuous range of finished items
      const workFinished: Work.Done[] = [];

      let work: Work;
      // eslint-disable-next-line prefer-destructuring, no-cond-assign
      while (work = workQueue[0]) {
        // end of the continuous range of finished items
        if (!work.done) break;
        workQueue.shift();
        workFinished.push(work);
        continue;
      }

      if (isStopping) {
        // wait for the workQueue to empty
        // before rejecting the outer promise empty
        if (!workQueue.length) {
          console.debug(`[${ymdhms()}] queue empty... stopping`);
          return rej(isStopping.err);
        }
        console.debug(`[${ymdhms()}] waiting for workQueue` +
          ` to empty before stopping...` +
          ` ${workQueue.length} items left`);
        return;
      }

      // process the finished items
      if (workFinished.length) {
        completedQueue.push(...workFinished);
        complete();
      }

      if (pending.length) {
        enqueue();
      }

      if (!pending.length && !completedQueue.clone && !workQueue.length) {
        console.debug(`[${ymdhms()}] tick:` +
          ' finished!');
        res();
      }
    }

    /**
     * Enqueue as many works as possible
     */
    function enqueue() {
      // ensure we don't enqueue while we're in the process of stopping
      if (isStopping) return;

      enqueueMutex.runExclusive(async () => {
        // enqueue as many as possible
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (!idle.size) {
            break;
          }
          if (!pending.length) {
            console.debug(`[${ymdhms()}] enqueue:` +
              ` no more pending items`);
            break;
          }
          // TODO: can increase concurrency here
          // this is limits concurrency so we don't process too quickly away
          // from the current head
          if (!(workQueue.length < concurrency)) {
            break;
          }
          const identity = pending.shift()!;
          const processor = idle.shift()!;
          const index = (cursor += 1);
          workQueue.push({
            done: false,
            index,
            processor,
            result: null,
            identity,
          });
          processor
            .process(identity)
            .then((result) => handleDone(processor, result))
            .catch((err) => handleError(processor, err))
        }
      }) 
    }

    /**
     * Fired when a worker completes successfully
     * 
     * @param processor
     * @param result
     */
    function handleDone(processor: IContractProcessor, result: ContractResult) {
      const idx = workQueue.findIndex((bitem) => bitem.processor === processor);
      const done: Work.Done = {
        done: true,
        identity: workQueue[idx].identity,
        index: workQueue[idx].index,
        processor: null,
        result: Result.success(result),
      };
      workQueue[idx] = done;
      idle.push(processor);
      tick();
    }

    /**
     * Fired when a worker errors
     * 
     * @param processor
     * @param result
     */
    function handleError(processor: IContractProcessor, err: Error) {
      const idx = workQueue.findIndex((bitem) => bitem.processor === processor);
      const done: Work.Done = {
        done: true,
        identity: workQueue[idx].identity,
        index: workQueue[idx].index,
        processor: null,
        result: Result.fail(err),
      };
      workQueue[idx] = done;
      idle.push(processor);
      tick();
    }
  });
}