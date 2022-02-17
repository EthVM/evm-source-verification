import path from "node:path";
import fs from "node:fs";
import { IProcesorService } from "../../services/processor.service";
import { PullRequestFile, PullContractsService } from "./pull-contracts.service";
import { IDownloadService } from '../../services/download.service';
import { fexists, tmpFilename } from "../../libs/utils";
import { TestContract } from "../../models/contract.test.util";
import { TestContractService } from "../../services/contract.service.test.util";

describe('PullRequestService', () => {
  let tcontracts: TestContract[];
  let pullContractsService: PullContractsService;

  beforeEach(async () => {
    /**
     * mock downloads
     *
     * noop - no need to download
     * 
     * testCase contracts are already stored in filesystem
     */
    const downloadService: IDownloadService = {
      async file() {},
    };

    /**
     * mock processor
     *
     * noop - no need to download
     * 
     * testCase contracts are already verified in filesystem
     */
    const processorService: IProcesorService = {
      async process(): Promise<void> {},
    }

    const tcontractService = new TestContractService();

    pullContractsService = new PullContractsService(
      tcontractService,
      processorService,
      downloadService,
    );

    tcontracts = await tcontractService.getTestCases();
  });

  describe('process', () => {
    it(`should work`, async () => {
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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
      const files = tcontracts.flatMap((contract): PullRequestFile[] => ([
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