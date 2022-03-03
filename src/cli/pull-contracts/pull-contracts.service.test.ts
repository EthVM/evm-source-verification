import path from "node:path";
import fs from "node:fs";
import { PullRequestFile, PullContractsService } from "./pull-contracts.service";
import { IFileDownloader } from '../../services/download.service';
import { fexists, tmpFilename } from "../../libs/utils";
import { VerifiedTestContract } from "../../models/contract.verified.test.util";
import { VerifiedContractsFsTestService } from "../../services/contracts-fs.service.test.util";
import { ProcessorServiceMock } from "../../interfaces/processor.service.mock";

describe('PullContractsService', () => {
  let contracts: VerifiedTestContract[];
  let pullContractsService: PullContractsService;

  beforeEach(async () => {
    /**
     * mock downloads
     *
     * noop - no need to download
     * 
     * testCase contracts are already stored in filesystem
     */
    const downloadService: IFileDownloader = {
      async file() {},
    };

    const contractsFsService = new VerifiedContractsFsTestService();

    contracts = await contractsFsService.getContracts();

    const processorService = new ProcessorServiceMock({
      err: {
        errored: [],
        failed: [],
        noCompiler: [],
        unsupported: [],
        unverified: [],
      },
      ok: {
        jumped: [],
        skipped: [],
        verified: contracts,
      },
    });

    pullContractsService = new PullContractsService(
      contractsFsService,
      processorService,
      downloadService,
    );
  });

  describe('process', () => {
    it(`should work`, async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      await pullContractsService.process(files, { save: false });

      expect(true).toBeTruthy();
    });

    it('should throw if contract configs are missing', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await pullContractsService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
  });

    it('should throw if contract inputs are missing', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await pullContractsService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if non-contract files were added', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));
      files.push({
        filename: 'unknown',
        raw_url: '<url>',
        status: 'added',
      })

      // expect success (not to throw)
      let err: Error | undefined;
      await pullContractsService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if unknown contract-like files were added', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: path.join(contract.getDirname(), 'randomfile'),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await pullContractsService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should throw if any files were was mutated (other than added)', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'non-added-status',
        },
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));

      // expect success (not to throw)
      let err: Error | undefined;
      await pullContractsService
        .process(files, { save: false })
        .catch((_err) => { err = _err });

      expect(err).toBeInstanceOf(Error);
    });

    it('should save pull-request name, commit name, branch name, body', async () => {
      const files = contracts.flatMap((contract): PullRequestFile[] => ([
        {
          filename: contract.getConfigFilename(),
          raw_url: '<url>',
          status: 'added',
        },
        {
          filename: contract.getInputFilename(),
          raw_url: '<url>',
          status: 'added',
        },
      ]));
      const outPrNameFile = tmpFilename();
      const outBodyFile = tmpFilename();
      const outBranchNameFile = tmpFilename();
      const outCommitTitleFile = tmpFilename();
      expect(await fexists(outPrNameFile)).toBeFalsy();
      expect(await fexists(outBodyFile)).toBeFalsy();
      expect(await fexists(outBranchNameFile)).toBeFalsy();
      expect(await fexists(outCommitTitleFile)).toBeFalsy();
      await pullContractsService.process(files, {
        save: false,
        outPrNameFile,
        outBodyFile,
        outBranchNameFile,
        outCommitTitleFile,
      });
      expect(await fexists(outPrNameFile)).toBeTruthy();
      expect(await fexists(outBodyFile)).toBeTruthy();
      expect(await fexists(outBranchNameFile)).toBeTruthy();
      expect(await fexists(outCommitTitleFile)).toBeTruthy();
      await fs.promises.rm(outPrNameFile);
      await fs.promises.rm(outBodyFile);
      await fs.promises.rm(outBranchNameFile);
      await fs.promises.rm(outCommitTitleFile);
    })
  });
});