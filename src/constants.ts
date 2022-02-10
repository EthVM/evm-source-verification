export const SOLIDITY_COMPILE_TIMEOUT = 30_000;

/**
 * Maximum buffer size for text returned from a compiler
 *
 * 100 MiB seems to work fine
 */
export const SOLIDITY_MAX_OUTPUT_BUFFER_SIZE = 100 * 1024 * 1024;

/**
 * Maximum allowed contract verification concurrency
 * 
 * Anything higher than this will cause an error to be thrown
 */
export const MAX_CONCURRENCY = 30;

/**
 * Maximum distance contracts can parallel process ahead of the oldest
 * processing contract (earliest in the processing fifo queue)
 * 
 * For example if contract x takes a long time to process, other contracts
 * x + n may finish processing first, but they cannot be dispatched before x
 * because we want to input order
 *
 * Therefore we buffer processed contracts x + n in until x finishes
 * processing, and then dispatch completions insertion in-order
 * 
 * However if n is too large we could run into memory issues, so we limit
 * the distance to something small enough to be memory safe but high
 * enough to avoid throttling parallel processing
 */
export const MAX_CONTRACT_WORKAHEAD = 100;