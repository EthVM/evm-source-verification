import { Result } from "@nkp/result";
import { getTestCases } from "../../tests/utils/get-test-cases";
import { TestCase } from "../../tests/utils/test-case";
import { SolidityCompiler } from "../compilers/solidity.compiler";
import { SOLIDITY_COMPILE_TIMEOUT } from "../constants";
import { ICompiler } from "../types";
import { ICompilerService, CompilerService } from "./compiler.service";

describe('CompilerService', () => {
  let testCases: TestCase[] = [];
  let solidityCompiler: ICompiler;
  let compilerService: ICompilerService;

  beforeAll(async () => {
    testCases = await getTestCases();
  });

  beforeEach(async () => {
    solidityCompiler = new SolidityCompiler();
    compilerService = new CompilerService(solidityCompiler);
  })

  const count = 1;

  it(`should compile ${count} test cases successfully`, async () => {
    for (const testCase of testCases.slice(0, count)) {
      const [config, input, expected] = await Promise.all([
        testCase.getConfig(),
        testCase.getInput(),
        testCase.getOutput(),
      ]);

      const out = await compilerService.compile(config, input);
      if (Result.isFail(out)) throw out.value;

      expect(out.value).toEqual(expected);
    }
  }, count * SOLIDITY_COMPILE_TIMEOUT);
});