import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerServiceMock } from "../interfaces/compiler.service.mock";
import { VerifiedContractsFsTestService } from "./contracts-fs.service.test.util";
import { NodeService } from "./node.service";
import { ProcessorService } from "./processor.service";
import { VerificationService } from "./verification.service";

describe('ProcessorService', () => {
  let verifiedContractsService: VerifiedContractsFsTestService;
  let verifiedContracts: VerifiedTestContract[];
  let processorService: ProcessorService;

  beforeEach(async () => {
    verifiedContractsService = new VerifiedContractsFsTestService();
    verifiedContracts = await verifiedContractsService.getContracts();
    processorService = new ProcessorService(
      new CompilerServiceMock(verifiedContracts),
      new VerificationService(new NodeService())
    );
  });

  it('should work', async () => {
    await processorService.process(
      verifiedContracts,
      {
        concurrency: 5,
        failFast: true,
        jump: 0,
        save: false,
        skip: false,
      },
    );
    // expect not to have errored
    expect(true).toBeTruthy();

    // allow for extra time because it has to hit the eth node currently...
    // TODO: mock hitting the eth node
  }, 30_000);

  // TODO: test failure cases
});