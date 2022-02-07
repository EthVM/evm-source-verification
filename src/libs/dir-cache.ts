import path from 'node:path';
import fs from 'node:fs';

/**
 * Lazy directory creator
 *
 * Used to safely and lazily, within a single thread, ensure a directory exists
 *
 * Subsequent calls do nothing except wait for the directory to finish being
 * created if not already
 *
 * Safe to use concurrently within the same thread
 */
export class DirCache {
  /**
   * Chains that have been initialised
   */
  private readonly dirs: Map<string, Promise<void>> = new Map();

  /**
   * Create-once the directory for the filename if it doesn't exist
   * 
   * @param filename 
   * @returns 
   */
  ensureOf(filename: string): Promise<void> {
    const dirname = path.dirname(filename);
    return this.ensure(dirname);
  }

  /**
   * Create-once the directory if it doesn't exist
   * 
   * @param dirname 
   * @returns 
   */
  ensure(dirname: string): Promise<void> {
    let creation = this.dirs.get(dirname);
    if (!creation) {
      creation = fs
        .promises
        .mkdir(dirname, { recursive: true })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .then(() => {})
      ;
      this.dirs.set(dirname, creation);
    }
    return creation;
  }
}