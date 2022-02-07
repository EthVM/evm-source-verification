import { CompilerService, ICompilerService } from "./services/compiler.service";
import { ContractService, IContractService } from "./services/contract.service";
import { INodeService, NodeService } from "./services/node.service";
import { SolidityCompiler } from "./compilers/solidity.compiler";
import { IStateService, StateService } from "./services/state.service";
import { ICompiler } from "./types";
import { IVerificationService, VerificationService } from "./services/verification.service";

export interface IServices {
  contractService: IContractService;
  nodeService: INodeService;
  stateService: IStateService;
  compilerService: ICompilerService;
  verificationService: IVerificationService,
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

  const services: IServices = {
    contractService,
    stateService,
    nodeService,
    compilerService,
    verificationService,
  };

  return services;
}