import { Result } from "@nkp/result";
import { getTestCases } from "../../tests/utils/get-test-cases";
import { TestCase } from "../../tests/utils/test-case";
import { SolidityCompiler } from "../compilers/solidity.compiler";
import { SOLIDITY_COMPILE_TIMEOUT } from "../constants";
import { getMetadata } from "../libs/metadata";
import { ICompiler } from "../types";
import { ICompilerService, CompilerService } from "./compiler.service";
import { INodeService, NodeService } from "./node.service";
import { IVerificationService, VerificationService } from "./verification.service";

describe('VerificationService', () => {
  let testCases: TestCase[] = [];
  let solidityCompiler: ICompiler;
  let compilerService: ICompilerService;
  let nodeService: INodeService;
  let verificationService: IVerificationService;

  beforeAll(async () => {
    testCases = await getTestCases();
  });

  beforeEach(async () => {
    solidityCompiler = new SolidityCompiler();
    compilerService = new CompilerService(solidityCompiler);
    nodeService = new NodeService();
    verificationService = new VerificationService(nodeService);
  })

  const count = 1;

  it(`should verify ${count} test cases successfully`, async () => {
    for (const testCase of testCases.slice(0, count)) {
      const [config, input, expected] = await Promise.all([
        testCase.getConfig(),
        testCase.getInput(),
        testCase.getMetadata(),
      ]);

      const cout = await compilerService.compile(config, input);
      if (Result.isFail(cout)) throw cout.value;

      const vout = await verificationService.verify(cout.value, config);
      if (Result.isFail(vout)) throw vout.value;

      const actual = getMetadata(vout.value);

      expect(actual).toEqual(expected);
    }
  }, count * SOLIDITY_COMPILE_TIMEOUT);
});