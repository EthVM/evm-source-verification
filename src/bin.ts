import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerValidateGitDiffsCommand } from './cli/validate-git-diffs/validate-git-diffs.command';
import { registerVerifyCommand } from './cli/verify/verify.command';
import { registerCompileCommand } from './cli/compile/compile.command';
import { registerMetadataCommand } from './cli/metadata/metadata.command';

const argv = yargs(hideBin(process.argv)).usage('Usage $0 <cmd> [args]');

// load environment variables from .env file
config();

// register commands
registerValidateGitDiffsCommand(argv);
registerVerifyCommand(argv);
registerCompileCommand(argv);
registerMetadataCommand(argv);

argv.demandCommand(1);

argv.parse();

