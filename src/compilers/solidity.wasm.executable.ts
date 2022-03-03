/// <reference types="emscripten" />

import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert';
import { CompilerInput, CompilerOutput } from "../types";
import { ISolidityExecutable } from "./solidity.executable.interface";
import { SolidityCompilerNameDetails, solidityCompileWasmRaw, solidityCompileWasmSolc } from '../libs/solidity';
import { fabs, randomBase16 } from '../libs/utils';

/**
 * Provide access to WASM compilation
 */
export class SolidityWasmExecutable implements ISolidityExecutable {
  /**
   * absolute filename of the compiler
   */
  private readonly compilerFilename: string;

  /**
   * Create a new SolidityWasmExecutable
   *
   * @param compilerFilename  filename of the compiler
   * @param name              build info of the compiler
   */
  constructor(
    compilerFilename: string,
    private readonly name: SolidityCompilerNameDetails
  ) {
    this.compilerFilename = fabs(compilerFilename);
  }

  /**
   * Compile the solidity input using wasm
   * 
   * @param input     compiler input
   * @returns         compilation output
   */
  async compile(input: CompilerInput): Promise<CompilerOutput> {
    const { compilerFilename, name: info } = this;
    // const result = await solidityCompileWasmWorker(filename, info, input);
    const result = await primary({
      compilerFilename,
      info,
      input,
    });
    return result;
  }
}

/**
 * Wasm compilation input
 */
interface SolidityCompileWasmOptions {
  compilerFilename: string,
  info: SolidityCompilerNameDetails;
  input: CompilerInput;
}

const FORK_KEY = '_fork_';
const FORK_VALUE = `FORK_${__filename}`;

/**
 * Master (primary) messages
 */
type PtoW =
  | { type: 'shutdown', payload?: void; }
  | { type: 'input', payload: { id: string, options: SolidityCompileWasmOptions } }

/**
 * Worker messages
 */
type WtoP =
  | { type: 'ready', payload?: void }
  | { type: 'output', payload: { id: string, output: CompilerOutput } }

// /**
//  * Compile solidity input using Emscripten WASM
//  *
//  * Compiles in a separate process
//  *
//  * @param compilerFilename        name of the emscripten wasm file
//  * @param input                   compiler input
//  * @returns                       compiler output
//  */
// async function solidityCompileWasmFork(options: SolidityCompileWasmOptions): Promise<CompilerOutput> {
//   const output = await primary(options);
//   return output;
// }

/**
 * Compile a contract with wasm within a separate process
 *
 *  1. creates a worker
 *  2. commands it to perform computation
 *  3. returns the results
 *
 * @returns   resolves after the worker shuts down
 */
function primary(options: SolidityCompileWasmOptions): Promise<CompilerOutput> {
  /**
   * compilation id
   *
   * can be used to pool works in the future
   */
  const id = randomBase16(20);

  // Resolves or rejects after compilation completes or fails
  return new Promise((res, rej) => {
    let output: CompilerOutput | void;

    // create a worker by forking a NodeJS process
    const worker = cp.fork(path.resolve(__filename), {
      // ensure we don't acidentally execute the worker if the fork came from elsewhere
      env: { ...process.env, [FORK_KEY]: FORK_VALUE },
    });

    // initialise the worker
    init();

    /**
     * Send a message to the worker
     *
     * @param message             message to send to worker
     * @returns                   resolves after sending
     */
    function send(message: PtoW) {
      return new Promise<void>((sres, srej) => worker 
        .send(message, (err) => err
          ? srej(err)
          : sres()));
    }

    /**
     * Listen to the worker
     */
    function init() {
      worker.on('close', handleClose);
      worker.on('error', handleError);
      worker.on('message', handleMessage);
    }

    /**
     * Stop listening to the worker
     */
    function teardown() {
      worker.off('close', handleClose);
      worker.off('error', handleError);
      worker.off('message', handleMessage);
    }

    /**
     * Fired when the worker closes
     * 
     * After a process has ended and the stdio streams of a child process have been closed
     * 
     * @see https://nodejs.org/api/child_process.html#event-close
     *
     * @param code    exit code
     * @param signal  exit signal if exit was due to a p
     */
    function handleClose(code: number | null, signal: number | null) {
      // worker exited with failure code
      if (code !== 0) {
        const msg = `Child process send unexpected` +
          ` code=${code} signal=${signal}`;
        const err = new Error(msg);
        teardown();
        rej(err);
        return;
      }

      // worker exited before returning the compilation output
      if (!output) {
        const msg = `Child process exited before receiving output` +
          ` code=${code} signal=${signal}`;
        const err = new Error(msg);
        teardown();
        rej(err);
        return;
      }

      // success
      teardown();
      res(output);
    }

    /**
     * Fired when
     *
     * - The process could not be spawned, or
     * - The process could not be killed, or
     * - Sending a message to the child process failed.
     *
     * @see https://nodejs.org/api/child_process.html#event-error
     *
     * @param err 
     */
    function handleError(err: Error) {
      teardown();
      rej(err);
    }

    /**
     * Fired when a message is received from the worker
     *
     * @param message   message from the worker
     */
    function handleMessage(_message: cp.Serializable) {
      const message = _message as WtoP;

      switch (message.type) {
        case 'ready':
          // send input command
          send({ type: 'input', payload: { options, id } });
          break;
        case 'output':
          // received output
          assert.ok(message.payload.id === id, 'received output for different request?');
          output = message.payload.output;
          // send shutdown comand
          send({ type: 'shutdown' });
          break;
        default: {
          // unexpected message
          const msg = `unhandled message`;
          const err = new Error(msg);
          teardown();
          rej(err);
        }
      }
    }
  })
}


if (process.env[FORK_KEY] === FORK_VALUE) {
  doWork();
}

/**
 * Execute the worker
 */
function doWork() {
  /** timeout if we never get a response */
  let initTimeout: null | ReturnType<typeof setTimeout> = null;

  init();

  /**
   * Send a message to the master
   *
   * @param message   message to send
   */
  async function send(message: WtoP) {
    process.send!(message);
  }

  // notify master that the worker is ready
  send({ type: 'ready', });

  /**
   * Unset the "waiting for request" timeout
   */
  function removeInitTimeout() {
    if (initTimeout != null) {
      clearTimeout(initTimeout);
      initTimeout = null;
    }
  }

  /**
   * Start listening to master
   */
  function init() {
    process.on('message', handleMessage);
    // wait 10 seconds for input
    initTimeout = setTimeout(handleInitTimeout, 10_000);
  }

  /**
   * Stop listening to master
   */
  function teardown() {
    process.off('message', handleMessage);
    removeInitTimeout();
  }

  function handleInitTimeout() {
    teardown();
    const msg = 'Worker timed out waiting for input';
    const err = new Error(msg);
    // throw an uncaught exception which should cause the process to crash
    throw err;
  }

  /**
   * @param {PtoW} message    message received from the master
   */
  async function handleMessage(_message: cp.Serializable) {
    const message = _message as PtoW;
    removeInitTimeout();

    switch (message.type) {
      case 'input': {
        const {
          payload: {
            id,
            options: {
              compilerFilename,
              input,
            },
          },
        } = message;

        // compile the input
        const stroutput = await solidityCompileWasmSolc(compilerFilename, input);
        // const stroutput = await solidityCompileWasmRaw(compilerFilename, input);
        const output = JSON.parse(stroutput) as CompilerOutput;

        // notify master of the output
        send({ type: 'output', payload: { id, output } });

        break;
      }

      case 'shutdown': {
        teardown();
        // force quit
        // for some reason the solidity Emscripten WASM makes the NodeJS
        // process hang for a while before being able to quit... so we
        // force the process to exit here to speed things up doing compilation
        // in a separate process should hopefully stop memory leak issues
        // in-case we're not letting solidity teardown properly
        process.exit(0);
        return;
      }

      default: {
        teardown();
        const msg = `unhandled message ${(message as PtoW).type}`;
        throw new Error(msg);
      }
    }
  }
}