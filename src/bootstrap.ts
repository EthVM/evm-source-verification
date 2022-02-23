import {
  CompilerService,
  ICompilerService
} from "./services/compiler.service";
import {
  ContractService,
  ContractServiceOptions,
} from "./services/contract.service";
import {
  INodeService,
  NodeService,
  NodeServiceOptions
} from "./services/node.service";
import {
  SolidityCompiler,
  SolidityServiceOptions
} from "./compilers/solidity.compiler";
import {
  VerificationService,
  VerificationServiceOptions
} from "./services/verification.service";
import {
  ProcessorService
} from "./services/processor.service";
import { DownloadService } from "./services/download.service";
import { PullContractsService } from "./cli/pull-contracts/pull-contracts.service";
import { SummariseService, SummariseServiceOptions } from "./cli/summarise/summarise.service";

export interface IServices {
  contractService: ContractService;
  nodeService: INodeService;
  compilerService: ICompilerService;
  pullContractsService: PullContractsService;
  verificationService: VerificationService;
  processorService: ProcessorService;
  buildStateService: SummariseService;
}

export interface BootstrapOptions {
  contracts?: ContractServiceOptions;
  nodes?: NodeServiceOptions;
  solidity?: SolidityServiceOptions;
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
  const contractService = new ContractService(options?.contracts);
  const nodeService = new NodeService(options?.nodes);
  const solidity = new SolidityCompiler(options?.solidity);
  const compilerService = new CompilerService(solidity);
  const verificationService = new VerificationService(
    nodeService,
    options?.verification
  );
  const processorService = new ProcessorService(
    compilerService,
    verificationService,
  );
  const pullContractsService = new PullContractsService(
    contractService,
    processorService,
    new DownloadService(),
  );
  const buildStateService = new SummariseService(options?.buildState);

  const services: IServices = {
    contractService,
    nodeService,
    compilerService,
    verificationService,
    processorService,
    pullContractsService,
    buildStateService,
  };

  return services;
}