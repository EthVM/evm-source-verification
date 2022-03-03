import { ISolidityExecutable } from "../compilers/solidity.executable.interface";
import { SolidityBuildInfo } from "../libs/solidity";

/**
 * Provides access to executable solidity compilers
 */
export interface ISolidityExecutableProvider {
  /**
   * Get an executable solidity compiler based on the desired build info given
   * 
   * @param build     build to get an executable for
   * @returns         executable
   */
  getExecutable(build: SolidityBuildInfo): Promise<ISolidityExecutable>;
}
