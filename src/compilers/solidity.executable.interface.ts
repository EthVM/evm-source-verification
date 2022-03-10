import { CompilerInput, CompilerOutput } from "../types";

export interface ISolidityExecutable {
  compile(input: CompilerInput): Promise<CompilerOutput>;
}
