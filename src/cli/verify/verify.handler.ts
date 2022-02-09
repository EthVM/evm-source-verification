import fs from "node:fs";
import { VerifyCliArgs } from "./verify.types";
import { processChainContracts, processContracts } from "../../libs/contracts.process";
import { bootstrap, IServices } from "../../bootstrap";
import { Address, ChainId } from "../../types";
import { toBN } from "../../libs/utils";

interface VerifyCliOptions {
  save: boolean;
  skip: boolean;
  failFast: boolean;
}

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
  } = args;

  const options: VerifyCliOptions = {
    failFast,
    save,
    skip, 
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

  else {
    const msg = 'You must provide either --chainId or --file';
    throw new Error(msg);
  }

  // success
  console.info('✔ success: verify complete');
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
  options: VerifyCliOptions,
): Promise<void> {
  const contracts = await services.contractService.getChainContracts({ chainId });

  // TODO: respect `address`
  await processChainContracts(
    chainId,
    contracts,
    services,
    {
      failFast: options.failFast,
      save: options.save,
      skip: options.skip,
    },
  );
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
  options: VerifyCliOptions,
): Promise<void> {
  // '-' -> stdin file descriptor
  const useFile = file === '-' ? 0 : file

  const dirs = fs
    .readFileSync(useFile, 'utf-8',)
    .trim()           // remove trailing whitespace
    .split('\n')      // split new lines
    .filter(Boolean); // remove empty lines

  const chains = services
    .contractService
    .parseContractFilenames(dirs);

  await processContracts(
    chains,
    services,
    {
      failFast: options.failFast,
      save: options.save,
      skip: options.skip,
    },
  );
}
