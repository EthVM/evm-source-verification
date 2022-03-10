import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import { HttpError } from "../errors/http.error";

/**
 * TODO: find an appropriate third party library for this
 */

/**
 * Download a file
 * 
 * @param uri           uri to download
 * @param filename      filename to download to
 * @throws {HttpError | Error}
 */
export async function downloadFile(
  uri: string,
  filename: string,
): Promise<void> {
  // send requset
  const { res } = await request(uri);
  // write to file
  await new Promise((resolve, reject) => {
    const fws = fs.createWriteStream(filename);
    fws.on('finish', resolve);
    fws.on('error', reject);
    res.pipe(fws);
  })
}


/**
 * Download JSON from a URL
 *
 * @param uri
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export async function downloadJson<T>(uri: string): Promise<T> {
  const { res } = await request(uri, {
    headers: {
      accepts: 'application/json',
    },
  });

  const contentType = res.headers['content-type']!;

  // expect content type as application/json or text/plain
  if (!/(?:application\/json|text\/plain)/.test(contentType)) {
    throw new Error(`uhandled content type: ${contentType}`);
  }

  // expect charset to be utf-8
  const charset = contentType.match(/charset=([a-z\-0-9]+)/i);
  if (charset && charset[1] !== 'utf-8') {
    throw new Error(`unhandled charset: ${charset[1]}`);
  }

  // assume encoding is utf-8 if no charset is given
  // data will then be a string
  type ChunkType = string;
  let raw = '';
  res.setEncoding('utf-8');

  return new Promise<T>((resolve, reject) => {
    res.on('data', handleData);
    res.on('error', handleError)
    res.on('close', handleClose)
    function cleanup() {
      res.off('data', handleData);
      res.off('error', handleError);
      res.off('close', handleClose);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleData(chunk: ChunkType) {
      raw += chunk;
    }
    function handleError(err: Error) {
      cleanup();
      reject(err);
    }
    function handleClose() {
      cleanup();
      if (!res.complete) {
        const msg = 'the connection was terminated while the message was' +
          ' being sent';
        reject(new Error(msg))
        return;
      }
      // success
      try {
        // extract json
        const json = JSON.parse(raw) as T;
        resolve(json);
      } catch (err) {
        // response wasn't valid json
        reject(err);
      }
    }
  });
}


export interface RequestResult {
  req: http.ClientRequest;
  res: http.IncomingMessage;
}

/**
 * Make a request to a uri
 *
 * @param uri     uri to request
 * @returns       resolves with the incoming message stream
 * @throws {HttpError | Error}
 */
export function request(uri: string, opts?: http.RequestOptions): Promise<RequestResult> {
  return new Promise<RequestResult>((resolve, reject) => {
    makeRequest(uri, 0);

    function makeRequest(directUri: string, redirects: number) {
      const hreq = https.get(directUri, opts ?? {}, (hres) => {
        const code = hres.statusCode ?? 500;
          // success - received a non-error-code response
          if ((code >= 200) && (code < 300)) {
            resolve({ req: hreq, res: hres });
            return;
          }

          // redirect - follow
          if (hres.headers.location) {
            if (redirects >= 10) {
              reject(new Error(`too many redirects (${redirects})`));
              return;
            }
            makeRequest(hres.headers.location, redirects += 1);
            return;
          }

          // unexpected response
          const msg = `Unexpected response: ${code}, ${hres.statusMessage}`;
          const err = HttpError.fromHttpRes(hres, msg, { uri });
          reject(err);
      });
    }
  });
}

