import { downloadFile } from "../libs/utils";

/**
 * Provides access to file downloads
 *
 * Allows downloads to be mocked
 */
export interface IDownloadService {
  /**
   * Download a file from a URI
   *
   * @param uri         URI to download from
   * @param filename    filename to download to
   * @returns           resolves after download completes
   */
  // eslint-disable-next-line class-methods-use-this
  file(uri: string, filename: string): Promise<void>;
}

/**
 * Provides access to file downloads
 *
 * Allows downloads to be mocked
 */
export class DownloadService implements IDownloadService {
  /**
   * Download a file from a URI
   *
   * @param uri         URI to download from
   * @param filename    filename to download to
   * @returns           resolves after download completes
   */
  // eslint-disable-next-line class-methods-use-this
  file(uri: string, filename: string): Promise<void> {
    return downloadFile(uri, filename);
  }
}
