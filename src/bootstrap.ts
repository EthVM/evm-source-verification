import {
  CompilerService,
  ICompilerService
} from "./services/compiler.service";
import { ContractService,
  ContractServiceOptions,
  IContractService
} from "./services/contract.service";
import { INodeService,
  NodeService,
  NodeServiceOptions
} from "./services/node.service";
import { SolidityCompiler,
  SolidityServiceOptions
} from "./compilers/solidity.compiler";
import { IStateService,
  StateService,
  StateServiceOptions
} from "./services/state.service";
import { IVerificationService,
  VerificationService,
  VerificationServiceOptions
} from "./services/verification.service";
import { ContractProcessorService,
  IContractProcessorService
} from "./services/contract-processor.service";
import { IParallelProcessorService,
  ParallelProcessorService
} from "./services/parallel-processor.service";

export interface IServices {
  contractService: IContractService;
  nodeService: INodeService;
  stateService: IStateService;
  compilerService: ICompilerService;
  verificationService: IVerificationService;
  contractProcessorService: IContractProcessorService;
  parallelProcessorService: IParallelProcessorService;
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
  const contractProcessorService = new ContractProcessorService(
    compilerService,
    verificationService,
  );
  const parallelProcessorService = new ParallelProcessorService(
    contractProcessorService,
    stateService,
  );

  const services: IServices = {
    contractService,
    stateService,
    nodeService,
    compilerService,
    verificationService,
    contractProcessorService,
    parallelProcessorService,
  };

  return services;
}