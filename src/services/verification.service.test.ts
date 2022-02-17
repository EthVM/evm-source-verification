import { TestContract } from "../../tests/utils/test-contract";
import { TestContractService } from "../../tests/utils/test-contract-service";
import { getMetadata } from "../libs/metadata";
import { ICompilerService } from "./compiler.service";
import { CompilerServiceMock } from "./compiler.service.mock";
import { NodeService } from "./node.service";
import { VerificationService } from "./verification.service";

describe('VerificationService', () => {
  let tcontractService: TestContractService;
  let testCases: TestContract[];
  let compilerService: ICompilerService;
  let verificationService: VerificationService;

  beforeAll(async () => {
    tcontractService = new TestContractService();
    testCases = await tcontractService.getTestCases();
    compilerService = new CompilerServiceMock(testCases);
  });

  beforeEach(async () => {
    verificationService = new VerificationService(new NodeService());
  })

  it(`should verify test cases successfully`, async () => {
    for (const testCase of testCases) {
      const [config, input, expected] = await Promise.all([
        testCase.storage.getConfig(),
        testCase.storage.getInput(),
        testCase.storage.getMetadata(),
      ]);
      const out = await compilerService.compile(config, input);
      const verify = await verificationService.verify(out, config);
      const actual = getMetadata(verify);
      expect(actual).toEqual(expected);
    }
  });
});