import { TestContract } from "../../tests/utils/test-contract";
import { TestContractService } from "../../tests/utils/test-contract-service";
import { SolidityCompiler } from "../compilers/solidity.compiler";
import { SOLIDITY_COMPILE_TIMEOUT } from "../constants";
import { ICompiler } from "../types";
import { ICompilerService, CompilerService } from "./compiler.service";

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
        testCase.storage.getConfig(),
        testCase.storage.getInput(),
        testCase.getOutput(),
      ]);

      const out = await compilerService.compile(config, input);
      expect(out).toEqual(expected);
    }
  }, count * SOLIDITY_COMPILE_TIMEOUT);
});