import { CompilerService, ICompilerService } from "./services/compiler.service";
import { ContractService, IContractService } from "./services/contract.service";
import { INodeService, NodeService } from "./services/node.service";
import { SolidityCompiler } from "./compilers/solidity.compiler";
import { IStateService, StateService } from "./services/state.service";
import { ICompiler } from "./types";
import { IVerificationService, VerificationService } from "./services/verification.service";
import { ContractProcessorService, IContractProcessorService } from "./services/contract-processor.service";
import { IParallelProcessorService, ParallelProcessorService } from "./services/parallel-processor.service";

export interface IServices {
  contractService: IContractService;
  nodeService: INodeService;
  stateService: IStateService;
  compilerService: ICompilerService;
  verificationService: IVerificationService;
  contractProcessorService: IContractProcessorService;
  parallelProcessorService: IParallelProcessorService;
}

/**
 * Create the application services
 *
 * TODO: optionally inject options
 *
 * @returns   application services
 */
export async function bootstrap(): Promise<IServices> {
  const contractService: IContractService = new ContractService();
  const nodeService: INodeService = new NodeService();
  const stateService: IStateService = new StateService();
  const solidity: ICompiler = new SolidityCompiler();
  const compilerService: ICompilerService = new CompilerService(solidity);
  const verificationService: IVerificationService = new VerificationService(nodeService);
  const contractProcessorService: IContractProcessorService = new ContractProcessorService(
    compilerService,
    verificationService,
  );
  const parallelProcessorService: IParallelProcessorService = new ParallelProcessorService(
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