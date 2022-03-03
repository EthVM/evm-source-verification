import assert from 'node:assert';
import crypto from 'node:crypto';
import { CompilationError } from '../errors/compilation.error';
import { getCompilerName, isSolidityOutputOk, SolidityCompilerName } from '../libs/solidity';
import { IContractWithOutput } from '../models/contract.test.util';
import { CompilerInput, CompilerOutputErr, CompilerOutputOk } from "../types";
import { ILanguageService } from './language.service.interface';

interface HashInput {
  compilerName: string;
  input: CompilerInput;
}

/**
 * Mock a compiler
 *
 * LanguageMockService
 *
 * "Compiles" contracts for a language by returning their precomputed compiler output
 */
export class LanguageServiceMock implements ILanguageService {
  /**
   * Maps hashes of the "compile" method's input to the corresponding
   * contract
   */
  private initialisation: null | Promise<void> = null;

  /**
   * Cache of hashes to contracts
   */
  private cache: Map<string, IContractWithOutput> = new Map();

  /**
   * Create a new LanguageMockService
   *
   * @param contracts   precompiled test contracts
   */
  constructor(private readonly contracts: IContractWithOutput[]) {}

  /**
   * Hash the object
   * 
   * @note hash depends on ordering of the json keys
   *
   * @param json
   * @returns
   */
  // eslint-disable-next-line class-methods-use-this
  private hash(json: HashInput): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(json))
      .digest('hex');
  }

  /**
   * Map outputs
   *
   * @returns 
   */
  private initialise(): Promise<void> {
    if (this.initialisation) return this.initialisation;
    this.initialisation = (async (): Promise<void> => {
      await Promise.all(this.contracts.map(async (contract) => {
        const [input, config] = await Promise.all([
          contract.getInput(),
          contract.getConfig(),
        ]);
        const compilerName = getCompilerName(config);
        const hashInput = { compilerName, input };
        const hash = this.hash(hashInput);
        this.cache.set(hash, contract);
      }));
    })();
    return this.initialisation;
  }


  /**
   * Get a cached contract
   *
   * @param hashInput
   * @returns
   */
  public async getContract(hashInput: HashInput): Promise<IContractWithOutput> {
    await this.initialise();
    const hash = this.hash(hashInput);
    const contract = this.cache.get(hash);
    // may be because the order of keys in the "input" json changed
    assert.ok(contract, 'LanguageServiceMock: no matching contract found');
    return contract;
  }

  /**
   * Return the output of a precompiled contract
   *
   * @param compilerName
   * @param input
   * @returns
   */
  public async compile(
    compilerName: SolidityCompilerName,
    input: CompilerInput,
  ): Promise<CompilerOutputOk> {
    await this.initialise();
    const contract = await this.getContract({ compilerName, input });
    const output = await contract.getOutput();
    if (!isSolidityOutputOk(output)) {
      throw new CompilationError(
        'output is not okay',
        { output: output as CompilerOutputErr },
      );
    }
    return output;
  }
}