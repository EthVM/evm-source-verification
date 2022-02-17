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
  IStateService,
  StateService,
  StateServiceOptions
} from "./services/state.service";
import {
  VerificationService,
  VerificationServiceOptions
} from "./services/verification.service";
import {
  ProcessorService
} from "./services/processor.service";
import { PullRequestService } from "./services/pull-request.service";
import { DownloadService } from "./services/download.service";

export interface IServices {
  contractService: ContractService;
  nodeService: INodeService;
  stateService: IStateService;
  compilerService: ICompilerService;
  pullRequestService: PullRequestService;
  verificationService: VerificationService;
  processorService: ProcessorService;
}

export interface BootstrapOptions {
  contracts?: ContractServiceOptions;
  nodes?: NodeServiceOptions;
  state?: StateServiceOptions;
  solidity?: SolidityServiceOptions;
  verification?: VerificationServiceOptions;
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
  const stateService = new StateService(options?.state);
  const solidity = new SolidityCompiler(options?.solidity);
  const compilerService = new CompilerService(solidity);
  const verificationService = new VerificationService(
    nodeService,
    options?.verification
  );
  const processorService = new ProcessorService(
    stateService,
    compilerService,
    verificationService,
  );
  const pullRequestService = new PullRequestService(
    contractService,
    processorService,
    new DownloadService(),
  );

  const services: IServices = {
    contractService,
    stateService,
    nodeService,
    compilerService,
    verificationService,
    processorService,
    pullRequestService,
  };

  return services;
}