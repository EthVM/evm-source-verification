import { IncomingMessage } from "node:http";

interface HttpErrorRequestOptions {
  uri: string,
}

export interface HttpErrorResponseOptions {
  statusCode?: number,
  statusMessage?: string,
}

export interface HttpErrorOptions extends
  HttpErrorRequestOptions,
  HttpErrorResponseOptions {}

/**
 * Thrown when there a http request results in a not-okay status
 * (code >=400 && code <=600)
 */
export class HttpError extends Error {
  /**
   * Uri of the original request
   */
  public readonly uri: string;

  /**
   * Statuscode of the result
   * 
   * -1 if the response has no status code
   * (eg the response is never received)
   */
  public readonly statusCode: number;

  /**
   * Status message of the result
   * 
   * undefined if the response has no status code
   * (eg the response is never received)
   */
  public readonly statusMessage: null | string;

  /**
   * Create a new HttpError from a http response object
   * 
   * @param res         http response object
   * @param message     message for the error
   * @param options     options that aren't part of the http response
   * @returns           HttpError object
   */
  static fromHttpRes(
    res: IncomingMessage,
    message: string,
    options: HttpErrorRequestOptions,
  ): HttpError {
    return new HttpError(
      message,
      {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        uri: options.uri,
      }
    );
  }

  constructor(
    message: string,
    options: HttpErrorOptions,
  ) {
    super(message);
    this.uri = options.uri;
    this.statusCode = options.statusCode ?? -1;
    this.statusMessage = options.statusMessage ?? null;
  }
}

