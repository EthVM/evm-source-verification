import {
  CompilerService,
} from "./services/compiler.service";
import {
  INodeService,
  NodeService,
  NodeServiceOptions,
} from "./services/node.service";
import {
  VerificationService,
  VerificationServiceOptions
} from "./services/verification.service";
import {
  ProcessorService
} from "./services/processor.service";
import { DownloadService, IDownloadService } from "./services/download.service";
import { PullContractsService } from "./cli/pull-contracts/pull-contracts.service";
import { SummariseService, SummariseServiceOptions } from "./cli/summarise/summarise.service";
import { BaseContractsFsService, ContractServiceOptions } from "./services/contracts-fs.service.base";
import { ContractsFsService } from "./services/contracts-fs.service";
import { ISolidityReleaseProvider, SolidityReleaseProvider } from "./services/solidity-release.provider";
import { CompilerFsService } from "./services/compiler-fs.service";
import { SolidityExecutableProvider } from "./services/solidity-executable.provider";
import { SolidityService } from "./services/solidity.service";
import { SolidityArchProvider } from "./services/solidity-arch.provider";
import { ICompilerService } from "./interfaces/compiler.service.interface";
import { SolidityBuildProvider } from "./services/solidity-build.provider";
import { ISolidityExecutableProvider } from "./interfaces/solidity-executable.provider.interface";

export interface IServices {
  contractFsService: BaseContractsFsService;
  nodeService: INodeService;
  compilerService: ICompilerService;
  pullContractsService: PullContractsService;
  verificationService: VerificationService;
  processorService: ProcessorService;
  summariseService: SummariseService;
  compilerFsService: CompilerFsService;
  solReleaseProvider: ISolidityReleaseProvider;
  solExecProvider: ISolidityExecutableProvider;
  downloadService: IDownloadService;
}

export interface BootstrapOptions {
  contracts?: ContractServiceOptions;
  nodes?: NodeServiceOptions;
  verification?: VerificationServiceOptions;
  buildState?: SummariseServiceOptions;
}

/**
 * Create the application services
 *
 * TODO: optionally inject options
 *
 * @returns   application services
 */
export async function bootstrap(options?: BootstrapOptions): Promise<IServices> {
  const contractFsService = new ContractsFsService(options?.contracts);
  const nodeService = new NodeService(options?.nodes);
  const downloadService = new DownloadService();
  const compilerFsService = new CompilerFsService(downloadService);

  const solReleaseProvider = new SolidityReleaseProvider(downloadService);
  const solArchProvider = new SolidityArchProvider();
  const solBuildProvider = new SolidityBuildProvider(solReleaseProvider);
  const solExecProvider = new SolidityExecutableProvider(compilerFsService);
  const solService = new SolidityService(solArchProvider, solBuildProvider, solExecProvider);

  const compilerService = new CompilerService(solService);
  const verificationService = new VerificationService(
    nodeService,
    options?.verification
  );
  const processorService = new ProcessorService(
    compilerService,
    verificationService,
  );
  const pullContractsService = new PullContractsService(
    contractFsService,
    processorService,
    new DownloadService(),
  );
  const summariseService = new SummariseService(options?.buildState);

  const services: IServices = {
    contractFsService,
    nodeService,
    compilerService,
    verificationService,
    processorService,
    pullContractsService,
    summariseService,
    downloadService,
    compilerFsService,
    solReleaseProvider,
    solExecProvider,
  };

  return services;
}