import { IContractWithEthCode } from "../models/contract.test.util";
import { UnverifiedContractsFsTestService, VerifiedContractsFsTestService } from "./contracts-fs.service.test.util";
import { NodeService } from "./node.service";

describe('NodeService', () => {
  let contracts: IContractWithEthCode[];
  let nodeService: NodeService;

  beforeAll(async () => {
    const verifiedService = new VerifiedContractsFsTestService();
    const unverifiedService = new UnverifiedContractsFsTestService();
    const verified = await verifiedService.getContracts();
    const unverified = await unverifiedService.getContracts();
    contracts = [...verified, ...unverified];
    nodeService = new NodeService();
  });

  const start = 0;
  const count = 10;
  it('should work', async () => {
    // TODO:  this may cause errors if the contracts become deleted
    //        account for this somehow...
    for (const contract of contracts.slice(start, start + count)) {
      const actual = await nodeService.getCode(contract);
      const expected = await contract.getEthCode();
      expect(actual).toEqual(expected);
    }
  }, count * 10_000);
});