import fs from 'node:fs';
import path from 'node:path';
import { Result } from "@nkp/result";
import { bootstrap } from "../../bootstrap";
import { fabs, readJsonFile, toBN } from "../../libs/utils";
import { CompiledOutput, ContractConfig, ContractIdentity, ContractInput } from "../../types";
import { CompileCliArgs } from "./compile.types";

/**
 * Handle the `compile` command
 *
 * Compile a single contract
 *
 * @param argv
 */
export async function handleCompileCommand(argv: CompileCliArgs): Promise<void> {
  const {
    chainId,
    address,
    dir,
    input,
    config,
    pretty,
    out,
  } = argv;

  const outDir = out?.dir;
  const outFile = out?.file;

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
  let output: undefined | Result<CompiledOutput, Error>;

  if (chainId || address) {
    // validate chain & address
    if (!chainId || !address) {
      const msg = '--address and --chainId must be specified together';
      throw new Error(msg);
    }

    // compile from identity
    const identity: ContractIdentity = {
      chainId: toBN(chainId).toNumber(),
      address,
    };
    output = await compileFromIdentity(identity);
  }

  else if (dir) {
    // compile from directory
    output = await compileFromDirectory(dir);
  }

  else if (config || input) {
    // validate config & input
    if (!config || !input) {
      const msg = '--input and --config must be specified together';
      throw new Error(msg);
    }
    // compile from config & input
    output = await compileFromConfigAndInput(config, input);
  }

  // something went wrong with options
  if (!output) throw new Error('invalid options');

  // failed
  if (Result.isFail(output)) throw output.value;

  const json = pretty
    ? JSON.stringify(output.value, null, 2)
    : JSON.stringify(output.value)

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
 * @param configFilename    contract config fileanme
 * @param inputFilename     contact input filename
 * @returns 
 */
async function compileFromConfigAndInput(
  configFilename: string,
  inputFilename: string,
): Promise<Result<CompiledOutput, Error>> {
  const services = await bootstrap();

  const {
    compilerService,
  } = services;

  const [jconfig, jinput] = await Promise.all([
    readJsonFile<ContractConfig>(fabs(configFilename)),
    readJsonFile<ContractInput>(fabs(inputFilename)),
  ]);

  if (!jinput) return Result.fail(Error(`input file "${inputFilename}" not found`));
  if (!jconfig) return Result.fail(Error(`config file "${configFilename}" not found`));

  const output = await compilerService.compile(jconfig, jinput);

  return output;
}


/**
 * Compile whatever contract is in the directory
 *
 * @param dir   directory with input and config file to use
 * @returns     compilation output
 */
async function compileFromDirectory(dir: string): Promise<Result<CompiledOutput, Error>> {
  const services = await bootstrap();

  const {
    compilerService,
    contractService,
  } = services;

  const { configBasename, inputBasename, } = contractService;

  const configFilename = path.join(dir, configBasename);
  const inputFilename = path.join(dir, inputBasename);

  const [jconfig, jinput] = await Promise.all([
    readJsonFile<ContractConfig>(configFilename),
    readJsonFile<ContractInput>(inputFilename),
  ]);

  if (!jconfig) return Result.fail(Error(`config file ${configBasename} not found in "${dir}"`));
  if (!jinput) return Result.fail(Error(`input file "${inputBasename}" not found in "${dir}"`));

  const output = await compilerService.compile(jconfig, jinput);

  return output;
}


/**
 * Compile from the contract identity
 *
 * @param identity    contract identity
 * @returns           compilation output
 */
async function compileFromIdentity(
  identity: ContractIdentity
): Promise<Result<CompiledOutput, Error>> {
  const services = await bootstrap();

  const {
    compilerService,
    contractService,
  } = services;

  const [jconfig, jinput] = await Promise.all([
    contractService.getConfig(identity),
    contractService.getInput(identity),
  ]);

  const output = await compilerService.compile(jconfig, jinput);

  return output;
}