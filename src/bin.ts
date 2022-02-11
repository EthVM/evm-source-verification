import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerVerifyCommand } from './cli/verify/verify.command';
import { registerPullContractsCommand } from './cli/pull-contracts/pull-contracts.command';

const argv = yargs(hideBin(process.argv)).usage('Usage $0 <cmd> [args]');

// load environment variables from .env file
config();

// register commands
registerVerifyCommand(argv);
registerPullContractsCommand(argv);

argv.demandCommand(1);

argv.parse();

