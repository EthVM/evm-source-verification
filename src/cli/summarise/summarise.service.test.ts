import fs from "node:fs";
import { SummariseService } from "./summarise.service";
import { tmpDir } from "../../libs/utils";
import { TestVerifiedContractsFsService } from "../../services/contracts-fs.service.test.util";
import { VerifiedTestContract } from "../../models/contract.verified.test.util";

describe('SummariseService', () => {
  let dirname: string;
  let buildStateService: SummariseService;
  let verifiedContracts: VerifiedTestContract[]

  beforeAll(async () => {
    dirname = await tmpDir();
    await fs.promises.mkdir(dirname, { recursive: true });
    const verifiedContractsService = new TestVerifiedContractsFsService();
    verifiedContracts = await verifiedContractsService.getContracts();
    buildStateService = new SummariseService({ dirname });
  });

  afterAll(async () => {
    await fs.promises.rm(dirname, { force: true, recursive: true, });
  });

  describe('extract', () => {
    it('should match each chainId', async () => {
      // assert doesn't throw
      const state = await buildStateService.extract(verifiedContracts);

      // assert all chainIds were matched / found
      const chainIds = Array.from(new Set(verifiedContracts.map(tc => tc.chainId)));
      expect(state.size).toEqual(chainIds.length);
      expect(Array.from(state.keys()).sort()).toEqual(chainIds.sort());
    });
  });

  describe('save', () => {
    it('should create a directory for each chainId', async () => {
      const state = await buildStateService.extract(verifiedContracts);

      const dirsBefore = await fs
        .promises
        .readdir(buildStateService.dirname, { withFileTypes: true });
      expect(dirsBefore.length).toEqual(0);

      // assert: does not error
      await buildStateService.save(state);

      // assert: creates a directory for each chain
      const dirsAfter = await fs
        .promises
        .readdir(buildStateService.dirname, { withFileTypes: true });
      expect(dirsAfter.length).toEqual(state.size);
    });
  });
});