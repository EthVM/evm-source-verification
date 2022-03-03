import { getMetadata } from "../libs/metadata";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerServiceMock } from "../interfaces/compiler.service.mock";
import { VerifiedContractsFsTestService } from "./contracts-fs.service.test.util";
import { NodeService } from "./node.service";
import { VerificationService } from "./verification.service";
import { ICompilerService } from "../interfaces/compiler.service.interface";

describe('VerificationService', () => {
  let verifiedContractsService: VerifiedContractsFsTestService;
  let verifiedContracts: VerifiedTestContract[];
  let compilerService: ICompilerService;
  let verificationService: VerificationService;

  beforeAll(async () => {
    verifiedContractsService = new VerifiedContractsFsTestService();
    verifiedContracts = await verifiedContractsService.getContracts();
    compilerService = new CompilerServiceMock(verifiedContracts);
  });

  beforeEach(async () => {
    verificationService = new VerificationService(new NodeService());
  })

  it(`should verify test cases successfully`, async () => {
    for (const testCase of verifiedContracts) {
      const [config, input, expected] = await Promise.all([
        testCase.getConfig(),
        testCase.getInput(),
        testCase.getMetadata(),
      ]);
      const out = await compilerService.compile(config, input);
      const verify = await verificationService.verify(out, config);
      const actual = getMetadata(verify);
      expect(actual).toEqual(expected);
    }
  });
});