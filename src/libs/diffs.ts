import type { components } from '@octokit/openapi-types'

/**
 * Extract formatted diffs
 * 
 * @param files 
 * @returns 
 */
// eslint-disable-next-line import/export
export function getDiffs(
  files: getDiffs.Entry[],
): getDiffs.Diffs {
  const fileDiffs = getDiffs.files(files);
  return fileDiffs;
}

// eslint-disable-next-line @typescript-eslint/no-namespace, import/export
export namespace getDiffs {
  export type Entry = components['schemas']['diff-entry'];

  /**
   * Generated file diffs
   */
  export interface Diffs {
    all: string[],
    added: string[],
    modified: string[],
    removed: string[],
    renamed: string[],
    addedModified: string[],
    copied: string[],
    changed: string[],
  }

  /**
   * Extract git diffs into arrays of files of different diff statuses
   * 
   * @param inputFiles  git-diffed files
   * @returns           files separated by their diff status
   */
  export function files(inputFiles: Entry[]): Diffs {
    // Get the changed files from the response payload.
    const all: string[] = [];
    const added: string[] = [];
    const modified: string[] = [];
    const changed: string[] = [];
    const removed: string[] = [];
    const renamed: string[] = [];
    const copied: string[] = [];
    const addedModified: string[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const file of inputFiles) {
      const { filename } = file;
      all.push(filename)
      switch (file.status) {
        case 'added':
          added.push(filename);
          addedModified.push(filename);
          break;
        case 'modified':
          modified.push(filename);
          addedModified.push(filename);
          break;
        case 'removed': removed.push(filename); break;
        case 'renamed': renamed.push(filename); break;
        case 'copied': copied.push(filename); break;
        case 'changed': changed.push(filename); break;
        default: {
          const msg = 'One of your files includes an unsupported file status'
            + ` '${file.status}', expected 'added', 'modified', 'removed', or`
            + ' \'renamed\'.'
          throw new Error(msg);
        }
      }
    }

    return {
      all,
      added,
      modified,
      copied,
      changed,
      removed,
      renamed,
      addedModified,
    }
  }
}


/**
 * Extract formatted diffs
 * 
 * @param files 
 * @returns 
 */
// eslint-disable-next-line import/export
export function getDiffs2(
  files: getDiffs.Entry[],
): getDiffs2.Diffs2 {
  const fileDiffs = getDiffs2.files2(files);
  return fileDiffs;
}

// eslint-disable-next-line @typescript-eslint/no-namespace, import/export
export namespace getDiffs2 {
  export type Entry2 = components['schemas']['diff-entry'];

  export type Entries = Map<string, Entry2>;

  /**
   * Generated file diffs
   */
  export interface Diffs2 {
    all: Entries,
    added: Entries,
    modified: Entries,
    removed: Entries,
    renamed: Entries,
    addedModified: Entries,
    copied: Entries,
    changed: Entries,
  }

  /**
   * Extract git diffs into arrays of files of different diff statuses
   * 
   * @param inputFiles  git-diffed files
   * @returns           files separated by their diff status
   */
  export function files2(inputFiles: Entry2[]): Diffs2 {
    // Get the changed files from the response payload.
    const all: Map<string, Entry2> = new Map();
    const added: Map<string, Entry2> = new Map();
    const modified: Map<string, Entry2> = new Map();
    const changed: Map<string, Entry2> = new Map();
    const removed: Map<string, Entry2> = new Map();
    const renamed: Map<string, Entry2> = new Map();
    const copied: Map<string, Entry2> = new Map();
    const addedModified: Map<string, Entry2> = new Map();

    // eslint-disable-next-line no-restricted-syntax
    for (const file of inputFiles) {
      const { filename } = file;
      all.set(filename, file)
      switch (file.status) {
        case 'added':
          added.set(filename, file);
          addedModified.set(filename, file);
          break;
        case 'modified':
          modified.set(filename, file);
          addedModified.set(filename, file);
          break;
        case 'removed': removed.set(filename, file); break;
        case 'renamed': renamed.set(filename, file); break;
        case 'copied': copied.set(filename, file); break;
        case 'changed': changed.set(filename, file); break;
        default: {
          const msg = 'One of your files includes an unsupported file status'
            + ` '${file.status}', expected 'added', 'modified', 'removed', or`
            + ' \'renamed\'.'
          throw new Error(msg);
        }
      }
    }

    return {
      all,
      added,
      modified,
      copied,
      changed,
      removed,
      renamed,
      addedModified,
    }
  }
}
