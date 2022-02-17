import { SolidityCompiler } from "../compilers/solidity.compiler";
import { SOLIDITY_COMPILE_TIMEOUT } from "../constants";
import { TestContract } from "../models/contract.test.util";
import { ICompiler } from "../types";
import { ICompilerService, CompilerService } from "./compiler.service";
import { TestContractService } from "./contract.service.test.util";

describe('CompilerService', () => {
  let tcontractService: TestContractService;
  let testCases: TestContract[];
  let solidityCompiler: ICompiler;
  let compilerService: ICompilerService;

  beforeAll(async () => {
    tcontractService = new TestContractService();
    testCases = await tcontractService.getTestCases();
  });

  beforeEach(async () => {
    solidityCompiler = new SolidityCompiler();
    compilerService = new CompilerService(solidityCompiler);
  })

  const count = 3;

  it(`should compile ${count} test cases successfully`, async () => {
    for (const testCase of testCases.slice(0, count)) {
      const [config, input, expected] = await Promise.all([
        testCase.getConfig(),
        testCase.getInput(),
        testCase.getOutput(),
      ]);

      const out = await compilerService.compile(config, input);
      expect(out).toEqual(expected);
    }
  }, count * SOLIDITY_COMPILE_TIMEOUT);
});