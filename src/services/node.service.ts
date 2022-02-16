import fs from 'node:fs';
import Web3 from 'web3';
import { fabs, mapGetOrCreate, toBN } from "../libs/utils";
import { ChainId, HasChainId } from '../types';

export interface INodeService {
  /**
   * Get a Web3 instance
   * 
   * @param opts
   * @returns
   */
  getWeb3(opts: HasChainId): Promise<Web3 | null>;

  /**
   * Get an RPC url for the chain
   * 
   * @param opts
   * @returns
   */
  getUrl(opts: HasChainId): Promise<string | null>;
}


/**
 * Configuration options for the NodeService
 */
export interface NodeServiceOptions {
  /**
   * relative filename with node rpc url's
   */
  primaryFilename?: string;

  /**
   * relative filename with fallback node rpc url's
   */
  fallbackFilename?: string;
}


/**
 * Provides RPC URL's for Web3 nodes
 */
export class NodeService implements INodeService {
  public static DEFAULTS = {
    PRIMARY_FILENAME: 'config/nodes',
    FALLBACK_FILENAME: 'config/nodes-fallback.json',
  }


  /**
   * Absolute filename of the primary nodes file
   *
   * @see NodeServiceOptions.primaryFilename
   */
  private readonly primaryFilename: string;


  /**
   * Absolute filename of the fallback nodes file
   *
   * @see NodeServiceOptions.fallbackFilename
   */
  private readonly fallbackFilename: string;


  /**
   * Cached Web3 instances
   */
  private web3s: Map<ChainId, Promise<null | Web3>> = new Map();


  /**
   * Cached chain urls
   */
  private urls: Map<ChainId, Promise<string>> = new Map();


  /**
   * @param options   configuration for the NodeService
   */
  constructor(options?: NodeServiceOptions) {
    this.primaryFilename = fabs(options?.primaryFilename
      ?? NodeService.DEFAULTS.PRIMARY_FILENAME);

    this.fallbackFilename = fabs(options?.fallbackFilename
      ?? NodeService.DEFAULTS.FALLBACK_FILENAME);
  }


  /** @see INodeService.getWeb3 */
  async getWeb3(opts: HasChainId): Promise<Web3 | null> {
    // get & cache web3 providers
    // TODO: REVISIT if this is still desirable
    return mapGetOrCreate(
      this.web3s,
      opts.chainId,
      async () => {
        const url = await this.getUrl(opts);
        if (!url) return null;
        return new Web3(url);
      });
  }


  /** @see INodeService.getUrl */
  async getUrl(opts: HasChainId): Promise<string | null> {
    // get & cache chain urls
    return mapGetOrCreate(
      this.urls,
      opts.chainId,
      async () => {
        let matchedUrl = await this.getPrimaryProvider(opts);
        if (matchedUrl != null) return matchedUrl;
        matchedUrl = await this.getFallbackProvider(opts);
        return matchedUrl;
      }
    );
  }


  /**
   * Get a provider URL for the chain from the primary nodes files
   *
   * @param opts
   * @returns
   */
  private async getPrimaryProvider(opts: HasChainId): Promise<null | string> {
    const content = await fs
      .promises
      .readFile(this.primaryFilename, 'utf-8');
    const match = NodeService.matchPrimaryProvider(content, opts);
    return match;
  }


  /**
   * Get a provider URL for the chain from the fallback files
   *
   * @param opts
   * @returns
   */
  private async getFallbackProvider(opts: HasChainId): Promise<null | string> {
    const content = await fs
      .promises
      .readFile(this.fallbackFilename, 'utf-8');
    const match = NodeService.matchFallbackProvider(content, opts);
    return match;
  }
}


export namespace NodeService {

  /**
   * Search for a provider url in the nodes file
   * 
   * @param content 
   * @returns 
   */
  export function matchPrimaryProvider(
    content: string,
    options: HasChainId,
  ): null | string {
    const { chainId } = options;
    // find a provider for the chain
    for (const line of content.split('\n')) {
      const match = line.match(/^([0-9]+):[^:]+:(.*)$/);

      // no regex match
      if (!match) continue;

      const [, nchainId, url] = match;

      // chain doesn't match
      if (toBN(nchainId).toNumber() !== chainId) continue;

      // success
      return url;
    }

    // fail
    return null;
  }

  /**
   * Search for a provider URL in the fallback json
   * 
   * @param json
   * @param options 
   * @returns 
   */
  export function matchFallbackProvider(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    json: any,
    options: HasChainId,
  ): null | string {
    const { chainId } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = json.find((fchain: any) => fchain?.chainId === chainId);
    if (!chain) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = chain.rpc?.find((rpc: any) => !rpc.includes('${'));
    return url ?? null;
  }
}
