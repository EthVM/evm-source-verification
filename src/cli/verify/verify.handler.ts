import fs from "node:fs";
import { VerifyCliArgs } from "./verify.types";
import { bootstrap, IServices } from "../../bootstrap";
import { Address, ChainId } from "../../types";
import { toBN } from "../../libs/utils";
import { Contract } from "../../models/contract";
import { ParallelProcessorOptions } from "../../services/parallel-processor.service";

/**
 * Execution the `verify` command
 *
 * @param args
 */
export async function handleVerifyCommand(args: VerifyCliArgs): Promise<void> {
  // process cli args
  const {
    address,
    chainId,
    file,
    skip,
    save,
    failFast,
    jump,
    dir,
    concurrency,
  } = args;

  const options: ParallelProcessorOptions = {
    jump,
    failFast,
    save,
    skip, 
    concurrency,
  }

  // validate the arguments

  const services = await bootstrap();

  if (chainId || address) {
    if (!chainId) {
      throw new Error('--chainId is required with --address');
    }
    const nchainId = toBN(chainId).toNumber();
    await handleChainId(services, nchainId, address, options);
  }

  else if (file) {
    await handleFile(services, file, options);
  }

  else if (dir) {
    await handleDir(services, dir, options);
  }

  else {
    const msg = 'You must provide either --chainId or --file';
    throw new Error(msg);
  }

  // success
  console.info('✔ success: verification complete');
}


/**
 * Verify all contracts for a chain
 *
 * @param services
 * @param chainId
 * @param address
 * @param skip
 */
async function handleChainId(
  services: IServices,
  chainId: ChainId,
  address: undefined | Address,
  options: ParallelProcessorOptions,
): Promise<void> {

  const contracts: Contract[] = [];
  if (address) {
    contracts.push(await services
      .contractService
      .getContract({ chainId, address }));
  } else {
    contracts.push(...await services
      .contractService
      .getChainContracts({ chainId }));
  }

  await services
    .parallelProcessorService
    .process(contracts, options);
}

/**
 * Verify all contract directories specified
 *
 * @param services
 * @param dir
 * @param skip
 */
async function handleDir(
  services: IServices,
  dir: string,
  options: ParallelProcessorOptions,
): Promise<void> {
  let dirnames: string[];

  if (dir === '-') {
    // read from stdsin
    dirnames = fs
      .readFileSync(0, 'utf-8',)
      .trim()           // remove trailing whitespace
      .split('\n')      // split new lines
      .filter(Boolean); // remove empty lines
  } else {
    // new-line separated directories
    dirnames = dir.split('\n').filter(Boolean);
  }

  const contracts = await services
    .contractService
    .hydrateContracts(dirnames.map(dirname => ({ dirname })));

  await services
    .parallelProcessorService
    .process(contracts, options);
}


/**
 * Verify all contracts specified in a file
 *
 * @param services
 * @param file
 * @param skip
 */
async function handleFile(
  services: IServices,
  file: string,
  options: ParallelProcessorOptions,
): Promise<void> {
  // '-' -> stdin file descriptor
  const useFile = file === '-' ? 0 : file

  const dirnames = fs
    .readFileSync(useFile, 'utf-8',)
    .trim()           // remove trailing whitespace
    .split('\n')      // split new lines
    .filter(Boolean); // remove empty lines

  const contracts = await services
    .contractService
    .hydrateContracts(dirnames.map(dirname => ({ dirname })));

  await services
    .parallelProcessorService
    .process(contracts, options);
}
