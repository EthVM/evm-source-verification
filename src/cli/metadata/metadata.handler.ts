import fs from 'node:fs';
import path from 'node:path';
import { Result } from "@nkp/result";
import { bootstrap, IServices } from "../../bootstrap";
import { fabs, readJSONFile, toBN } from "../../libs/utils";
import { ChainId, CompiledOutput, ContractConfig, ContractIdentity, ContractInput } from "../../types";
import { CompileCliArgs } from "./metadata.types";
import { getMetadata } from '../../libs/metadata';
import { VerifyContractResult } from '../../services/verification.service';

/**
 * Handle the `compile` command
 *
 * @param argv
 */
export async function handleMetadataCommand(argv: CompileCliArgs): Promise<void> {
  const {
    chainId: rawChainId,
    address,
    dir,
    input,
    config,
    pretty,
    out,
  } = argv;

  const outDir = out?.dir;
  const outFile = out?.file;

  const chainId = toBN(rawChainId).toNumber();

  // validate output opts

  if (!outDir && !outFile) {
    const msg = 'You cannot provide either --out.dir and --out.file'
    throw new Error(msg);
  }

  if (outDir && outFile) {
    const msg = 'You cannot provide both --out.dir and --out.file'
    throw new Error(msg);
  }

  // compile based on the options given
  let output: undefined | Result<VerifyContractResult, Error>;

  if (address) {
    // compile from identity
    const identity: ContractIdentity = {
      chainId: toBN(chainId).toNumber(),
      address,
    };
    output = await compileFromIdentity(identity);
  }

  else if (dir) {
    // compile from directory
    output = await compileFromDirectory(chainId, dir);
  }

  else if (config || input) {
    // validate config & input
    if (!config || !input) {
      const msg = '--input and --config must be specified together';
      throw new Error(msg);
    }
    // compile from config & input
    output = await compileFromConfigAndInput(chainId, config, input);
  }

  // something went wrong with options
  if (!output) throw new Error('invalid options');

  // failed
  if (Result.isFail(output)) throw output.value;

  const metadtata = getMetadata(output.value);

  const json = pretty
    ? JSON.stringify(metadtata, null, 2)
    : JSON.stringify(metadtata)

  // write to file
  if (outFile) {
    // ensure directory exists
    await fs
      .promises
      .mkdir(path.dirname(outFile), { recursive: true  });

    // write file
    await fs
      .promises
      .writeFile(outFile, json);

    // done
    return;
  }

  // write to directory
  if (outDir) {
    // ensure directory exists
    await fs
      .promises
      .mkdir(outDir, { recursive: true  });

    // write file
    await fs
      .promises
      .writeFile(path.join(outDir, 'output.json'), json);

    // done
    return;
  }

  // something went wrong
  throw new Error('something went wrong');
}


/**
 * Compile a contract given the input filenamd and config filename
 * 
 * @param chainId           chainId of the contract
 * @param configFilename    contract config fileanme
 * @param inputFilename     contact input filename
 * @returns 
 */
async function compileFromConfigAndInput(
  chainId: ChainId,
  configFilename: string,
  inputFilename: string,
): Promise<Result<VerifyContractResult, Error>> {
  const services = await bootstrap();

  const [jconfig, jinput] = await Promise.all([
    readJSONFile<ContractConfig>(fabs(configFilename)),
    readJSONFile<ContractInput>(fabs(inputFilename)),
  ]);

  if (!jinput) return Result.fail(Error(`input file "${inputFilename}" not found`));
  if (!jconfig) return Result.fail(Error(`config file "${configFilename}" not found`));

  const output = await services.compilerService.compile(jconfig, jinput);

  if (Result.isFail(output)) return output;

  const verify = await verifyOutput(
    chainId,
    services,
    jconfig,
    output.value
  );

  return verify;
}


/**
 * Compile whatever contract is in the directory
 *
 * @param chainId chainId of the contract
 * @param dir     directory with input and config file to use
 * @returns       compilation output
 */
async function compileFromDirectory(
  chainId: ChainId,
  dir: string,
): Promise<Result<VerifyContractResult, Error>> {
  const services = await bootstrap();

  const { configBasename, inputBasename, } = services.contractService;

  const configFilename = path.join(dir, configBasename);
  const inputFilename = path.join(dir, inputBasename);

  const [jconfig, jinput] = await Promise.all([
    readJSONFile<ContractConfig>(configFilename),
    readJSONFile<ContractInput>(inputFilename),
  ]);

  if (!jconfig) return Result.fail(Error(`config file ${configBasename} not found in "${dir}"`));
  if (!jinput) return Result.fail(Error(`input file "${inputBasename}" not found in "${dir}"`));

  const output = await services.compilerService.compile(jconfig, jinput);

  if (Result.isFail(output)) return output;

  const verify = await verifyOutput(
    chainId,
    services,
    jconfig,
    output.value
  );

  return verify;
}


/**
 * Compile from the contract identity
 *
 * @param identity    contract identity
 * @returns           compilation output
 */
async function compileFromIdentity(
  identity: ContractIdentity
): Promise<Result<VerifyContractResult, Error>> {
  const services = await bootstrap();

  const [jconfig, jinput] = await Promise.all([
    services.contractService.getConfig(identity),
    services.contractService.getInput(identity),
  ]);

  const output = await services
    .compilerService
    .compile(jconfig, jinput);

  if (Result.isFail(output)) return output;

  const verify = await verifyOutput(
    identity.chainId,
    services,
    jconfig,
    output.value
  );

  return verify;
}

async function verifyOutput(
  chainId: ChainId,
  services: IServices,
  config: ContractConfig,
  output: CompiledOutput,
): Promise<Result<VerifyContractResult, Error>> {
  const result = await services
    .verificationService
    .verify(output, config);
  return result;
}