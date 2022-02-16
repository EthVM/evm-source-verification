import { performance } from 'node:perf_hooks';
import { LinkedList } from "@nkp/linked-list";
import { Result } from "@nkp/result";
import { Mutex } from "async-mutex";
import { ymdhms } from "./utils";

type Work<T, R> =
  | Work.Processing<T, R>
  | Work.Done<T, R>

namespace Work {
  export interface Processing<T, R> {
    ctx: WorkCtx<T>,
    handler: WorkHandler<T, R>;
    done: false;
    result: null;
  }
  export interface Done<T, R> {
    ctx: WorkCtx<T>,
    handler: null;
    done: true;
    result: Result<R, Error>;
  }
}

export interface WorkCtx<T> {
  total: number;
  index: number;
  item: T;
  start: number;
  end: null | number;
}

export interface WorkHandler<T, R> {
  /**
   * process the item
   */
  (ctx: WorkCtx<T>): Promise<R>;
}

export interface ResultHandler<T, R> {
  /**
   * @param result    result of processing
   * @returns         true to continue, false to force stop
   */
  (result: Result<R, Error>, ctx: WorkCtx<T>): Promise<undefined | Error>;
}

/**
 * FIFO worker queue
 *
 * Guarantees order of results
 * 
 * @param pending           items to process
 * @param workHandlers      workers
 * @param resultHandler     result handler
 * @param maxWorkAhead      maximum distance we can exceed the head with
 *                          concurrency
 * @returns                 resolves after completion
 */
export function asyncQueue<T, R>(
  pending: T[],
  workHandlers: WorkHandler<T, R>[],
  resultHandler: ResultHandler<T, R>,
  maxWorkAhead?: number,
): Promise<void> {
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
     * Pending values
     */
    const pendingQueue: LinkedList<T> = new LinkedList(pending);

    /**
     * Idle processors that are ready to process the next contract
     */
    const idleQueue: LinkedList<WorkHandler<T, R>> = new LinkedList();

    /**
     * Queue of processing and processed-but-waiting-for-recognition items
     *
     * Preserves the same order as {@link pending}
     */
    const workQueue: LinkedList<Work<T, R>> = new LinkedList;

    /**
     * Items waiting to be post-processed
     * 
     * Preserves the same order as {@link pending}
     */
    const completedQueue: LinkedList<Work.Done<T, R>> = new LinkedList();

    /**
     * Notify lock to ensure we don't notify multiple times at once
     */
    const notifyLock = new Mutex();

    /**
     * Currently in a notifying run?
     */
    let isNotifying = false;

    const enqueueMutex = new Mutex();

    idleQueue.push(...workHandlers);

    const concurrency = workHandlers.length;

    tick();

    function forceStop(err: Error) {
      console.info(`[${ymdhms()}] stopping... ${err.toString()}`);
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
        let completed: undefined | Work.Done<T, R>;
        // eslint-disable-next-line no-cond-assign
        while ((completed = completedQueue.shift())) {
          const { ctx, result } = completed;
          didNotify = true;
          const err = await resultHandler(result, ctx);
          if (err) return void forceStop(err);
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
      const workFinished: Work.Done<T, R>[] = [];

      let work: Work<T, R> | undefined;
      // eslint-disable-next-line prefer-destructuring, no-cond-assign
      while (work = workQueue.head) {
        // end of the continuous range of finished items
        if (!work.done) break;
        workQueue.shift();
        workFinished.push(work);
        continue;
      }

      if (isStopping) {
        // wait for the workQueue to empty
        // before rejecting the outer promise empty
        if (!workQueue.size) {
          console.info(`[${ymdhms()}] queue empty... stopping`);
          return rej(isStopping.err);
        }
        console.info(`[${ymdhms()}] waiting for workQueue` +
          ` to empty before stopping...` +
          ` ${workQueue.size} items left`);
        return;
      }

      // process the finished items
      if (workFinished.length) {
        completedQueue.push(...workFinished);
        complete();
      }

      if (pendingQueue.size) {
        enqueue();
      }

      if (!pendingQueue.size && !completedQueue.size && !workQueue.size) {
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
          if (!idleQueue.size) {
            // no idle workers
            break;
          }
          if (!pendingQueue.size) {
            // no pending items left
            break;
          }
          if (workQueue.size >= (concurrency + (maxWorkAhead ?? 0))) {
            // exceeded workahead limit
            break;
          }
          const item = pendingQueue.shift()!;
          const handler = idleQueue.shift()!;
          const index = (cursor += 1);
          const start = performance.now();
          const ctx: WorkCtx<T> = { index, total, item, start, end: null };
          workQueue.push({ done: false, ctx, handler, result: null, });
          handler(ctx)
            .then((result) => handleDone(handler, result))
            .catch((err) => handleError(handler, err))
        }
      }) 
    }

    /**
     * Fired when a worker completes successfully
     * 
     * @param processor
     * @param result
     */
    function handleDone(handler: WorkHandler<T, R>, result: R) {
      const found = workQueue.replace(
        (work) => work.handler === handler,
        (prev): Work.Done<T, R> => ({
          done: true,
          ctx: { ...prev.ctx, end: performance.now() },
          handler: null,
          result: Result.success(result),
        }),
      );
      if (!found) throw new Error('something went wrong');
      idleQueue.push(handler);
      tick();
    }

    /**
     * Fired when a worker errors
     * 
     * @param handler
     * @param result
     */
    function handleError(handler: WorkHandler<T, R>, err: Error) {
      const found = workQueue.replace(
        (bitem) => bitem.handler === handler,
        (prev): Work.Done<T, R> => ({
          done: true,
          ctx: { ...prev.ctx, end: performance.now() },
          handler: null,
          result: Result.fail(err),
        }),
      );
      if (!found) throw new Error('something went wrong');
      idleQueue.push(handler);
      tick();
    }
  });
}