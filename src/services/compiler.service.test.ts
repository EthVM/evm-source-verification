import { ICompilerService } from "../interfaces/compiler.service.interface";
import { ILanguageService } from "../interfaces/language.service.interface";
import { LanguageServiceMock } from "../interfaces/language.service.mock";
import { VerifiedTestContract } from "../models/contract.verified.test.util";
import { CompilerService } from "./compiler.service";
import { TestVerifiedContractsFsService } from "./contracts-fs.service.test.util";

describe('CompilerService', () => {
  let verifiedContractsService: TestVerifiedContractsFsService;
  let verifiedContracts: VerifiedTestContract[];
  let langServiceMock: ILanguageService;
  let compilerService: ICompilerService;

  beforeAll(async () => {
    verifiedContractsService = new TestVerifiedContractsFsService();
    verifiedContracts = await verifiedContractsService.getContracts();
    langServiceMock = new LanguageServiceMock(verifiedContracts);
    compilerService = new CompilerService(langServiceMock);
  });

  describe('compile', () => {
    it('should work', async () => {
      for (const contract of verifiedContracts) {
        const [config, input, expected] = await Promise.all([
          contract.getConfig(),
          contract.getInput(),
          contract.getOutput(),
        ]);

        const out = await compilerService.compile(config, input);
        expect(out).toEqual(expected);
      }
    }, 30_000);
  })
});