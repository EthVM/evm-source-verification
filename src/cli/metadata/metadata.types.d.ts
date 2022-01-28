export interface CompileCliArgs {
  out?: {
    dir?: string;
    file?: string;
  },
  chainId: number;
  address?: string;
  dir?: string;
  input?: string;
  config?: string;
  pretty: boolean;
}
