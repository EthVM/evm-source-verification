import fs from 'node:fs';
import path from 'node:path';
import { Result } from "@nkp/result";
import { bootstrap } from "../../bootstrap";
import { fabs, readJSONFile, toBN } from "../../libs/utils";
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
  let output: undefined | CompiledOutput;

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

  const json = pretty
    ? JSON.stringify(output, null, 2)
    : JSON.stringify(output)

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
): Promise<CompiledOutput> {
  const services = await bootstrap();

  const {
    compilerService,
  } = services;

  const [jconfig, jinput] = await Promise.all([
    readJSONFile<ContractConfig>(fabs(configFilename)),
    readJSONFile<ContractInput>(fabs(inputFilename)),
  ]);

  if (!jinput)
    throw new Error(`input file "${inputFilename}" not found`);
  if (!jconfig)
    throw new Error(`config file "${configFilename}" not found`);

  const output = await compilerService.compile(jconfig, jinput);

  return output;
}


/**
 * Compile whatever contract is in the directory
 *
 * @param dir   directory with input and config file to use
 * @returns     compilation output
 */
async function compileFromDirectory(dir: string): Promise<CompiledOutput> {
  const services = await bootstrap();

  const {
    compilerService,
    contractService,
  } = services;

  const { configBasename, inputBasename, } = contractService;

  const configFilename = path.join(dir, configBasename);
  const inputFilename = path.join(dir, inputBasename);

  const [jconfig, jinput] = await Promise.all([
    readJSONFile<ContractConfig>(configFilename),
    readJSONFile<ContractInput>(inputFilename),
  ]);

  if (!jconfig)
    throw new Error(`config file ${configBasename} not found in "${dir}"`);
  if (!jinput)
    throw new Error(`input file "${inputBasename}" not found in "${dir}"`);

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
): Promise<CompiledOutput> {
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