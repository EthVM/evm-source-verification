import { delay } from "@nkp/delay";
import { Result } from "@nkp/result";
import { asyncQueue, ResultHandler, WorkHandler } from "./async-queue";

describe('async-queue', () => {
  it('should work', async () => {
    const items = [1, 2, 3, 4, 5];
    const handled: number[] = [];
    const results: Result<number, Error>[] = [];

    const workHandler: WorkHandler<number, number> = async (ctx) => {
      handled.push(ctx.item);
      return ctx.item + 1;
    };

    const resultHandler: ResultHandler<number, number> = async (result) => {
      results.push(result);
    };

    const handlerCalls: number[] = [];;

    await asyncQueue(
      items,
      Array.from({ length: items.length }, (_, i) => {
        handlerCalls.push(i);
        return workHandler;
      }),
      resultHandler,
    )

    // expect: handlers called in ordered round-robin
    expect(handlerCalls).toEqual(Array.from({ length: items.length }, (_, i) => i));

    // expect: handled all the items in insertion order
    expect(handled).toEqual(items);

    // expect: all results are successful
    expect(results.every(Result.isSuccess)).toBeTruthy();

    // expect: received all the results in insertion order
    expect(results.map(result => (result.value as number) - 1)).toEqual(items);
  });

  it('maintains insertion order despite out-of-order handling duration', async () => {
    // each item is the artificial processing duration for that item
    const items = [900, 0, 600, 1200, 300];
    const beforeWork: number[] = [];
    const afterWork: number[] = [];
    const results: Result<number, Error>[] = [];

    const workHandler: WorkHandler<number, number> = async (ctx) => {
      beforeWork.push(ctx.item);
      await delay(ctx.item);
      afterWork.push(ctx.item);
      return ctx.item + 1;
    };

    const resultHandler: ResultHandler<number, number> = async (result) => {
      results.push(result);
    };

    const handlerCalls: number[] = [];;

    await asyncQueue(
      items,
      Array.from({ length: items.length }, (_, i) => {
        handlerCalls.push(i);
        return workHandler;
      }),
      resultHandler,
    )

    // expect: handlers called in ordered round-robin
    expect(handlerCalls).toEqual(Array.from({ length: items.length }, (_, i) => i));

    // expect: started handling items in insertion order
    expect(beforeWork).toEqual(items);

    // expect: finished handling items processing time order
    expect(afterWork).toEqual(Array.from(items).sort((a, b) => a - b));

    // expect: all results are successful
    expect(results.every(Result.isSuccess)).toBeTruthy();

    // expect: received all the results in insertion order
    expect(results.map(result => (result.value as number) - 1)).toEqual(items);
  });

  it('exits when resultHandler returns an error', async () => {
    // each item is the artificial processing duration for that item
    const items = [900, 0, 600, 1200, 300];
    const beforeWork: number[] = [];
    const afterWork: number[] = [];
    const results: Result<number, Error>[] = [];

    const workHandler: WorkHandler<number, number> = async (ctx) => {
      beforeWork.push(ctx.item);
      await delay(ctx.item);
      afterWork.push(ctx.item);
      if (ctx.item === 600) throw new Error('test: something went wrong');
      return ctx.item + 1;
    };

    const resultHandler: ResultHandler<number, number> = async (result) => {
      results.push(result);
      // return the error on 600 to cause the queue to stop
      if (result.value instanceof Error) return result.value;
    };

    const handlerCalls: number[] = [];;

    let reason: Error;
    let didReject = false;

    await asyncQueue(
      items,
      Array.from({ length: items.length }, (_, i) => {
        handlerCalls.push(i);
        return workHandler;
      }),
      resultHandler,
    ).then(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      (_reason) => {
        didReject = true;
        reason = _reason;
      }
    )

    expect(didReject).toBeTruthy();
    expect(reason!.message).toEqual('test: something went wrong');

    // expect: handlers called in ordered round-robin
    expect(handlerCalls).toEqual(Array.from({ length: items.length }, (_, i) => i));

    // expect: started handling items in insertion order
    expect(beforeWork).toEqual(items);

    // expect: waits until currently processing items are finished
    expect(afterWork).toEqual(Array.from(items).sort((a, b) => a - b));

    // expect: only processed results until the failure
    expect(results.map(result => result.value)).toEqual([
      901,
      1,
      new Error('test: something went wrong'),
    ]);
  });
});