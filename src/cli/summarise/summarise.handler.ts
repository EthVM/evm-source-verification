import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { bootstrap, IServices } from "../../bootstrap";
import { fexists, frel } from "../../libs/utils";
import { logger } from "../../logger";

const log = logger.child({});

/**
 * Execution the `verify` command
 *
 * @param args
 */
export async function handleSummariseCommand(): Promise<void> {
  log.info('command: summarise');

  const services = await bootstrap();

  const { buildStateService } = services;

  log.info('summarising verified contracts to directory:' +
    ` "${frel(buildStateService.dirname)}"`);

  if (!(await fexists(buildStateService.dirname))) {
    work(services);
    return;
  }

  // check if state directory is empty
  const rootDirs = await fs
    .promises
    .readdir(buildStateService.dirname, { withFileTypes: true });

  if (!rootDirs.length) {
    // is empty
    work(services);
    return;
  }

  // state directory is not empty
  // ask before deleting it
  const rl = readline.createInterface(process.stdin, process.stdout);

  log.warn(`"${frel(buildStateService.dirname)}" has ${rootDirs.length} files:`
    + `\n  ${rootDirs
      .map((rootDir) => frel(path.join(buildStateService.dirname, rootDir.name)))
      .map((rmfile, i) => `${i + 1}. ${rmfile}`)
      .join('\n  ')}`);

  rl.question(
    `do you want to delete "${frel(buildStateService.dirname)}"` +
    ` and all of its contents to continue? (y/n): `,
    askDelete,
  );

    // eslint-disable-next-line no-inner-declarations
  async function askDelete(result: string) {
    if (result.toLowerCase() !== 'y') {
      // exit
      log.info('exiting');
      rl.close();
      return;
    }
    // continue
    rl.close();
    log.info(`removing ${buildStateService.dirname}`);
    await fs.promises.rm(buildStateService.dirname, { force: true, recursive: true });
    work(services);
  }
}


async function work(services: IServices) {
  const {
    contractService,
    buildStateService,
  } = services;

  const contracts = await contractService.getContracts();
  const state = await buildStateService.extract(contracts);
  await buildStateService.save(state);
}