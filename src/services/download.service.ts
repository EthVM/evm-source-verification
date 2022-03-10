import { downloadFile, downloadJson } from "../libs/download";

/**
 * Provides access to file downloading
 */
export interface IFileDownloader {
  /**
   * Download a file from a URI
   *
   * @param uri         URI to download from
   * @param filename    filename to download to
   * @returns           resolves after download completes
   * @throws {Error | HttpError}
   */
  file(uri: string, filename: string): Promise<void>;
}

/**
 * Provides access to json downloading
 */
export interface IJsonDownloader {
  /**
   * Download JSON from a URI
   *
   * @param uri         URI to download from
   * @returns           resolves with the parsed json
   * @throws {Error | HttpError}
   */
  json<T>(uri: string): Promise<T>;
}

/**
 * Provides access to downloads
 */
export interface IDownloadService extends IJsonDownloader, IFileDownloader {}

/**
 * Provides access to file downloads
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

  /**
   * Download JSON
   * 
   * @param uri 
   * @returns 
   */
  // eslint-disable-next-line class-methods-use-this
  json<T>(uri: string): Promise<T> {
    return downloadJson<T>(uri);
  }
}
