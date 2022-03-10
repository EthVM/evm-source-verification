import {
  enrichSolidityBuildList,
  SolidityArchConfig,
  SolidityPlatform,
  SolidityPlatformReleases,
  SolidityPlatformReleasesRaw,
} from "../libs/solidity";
import { mapGetOrCreate } from "../libs/utils";
import { IJsonDownloader } from "./download.service";

/**
 * Provides access to solidity releases
 */
export interface ISolidityReleaseProvider {
  /**
   * Get releases for a given architecture
   *
   * @param platform    target platform
   * @returns           binary releases for the platform
   */
  getReleases(arch: SolidityArchConfig): Promise<SolidityPlatformReleases>;
}

/**
 * Provides access to solidity releases
 */
export class SolidityReleaseProvider implements ISolidityReleaseProvider {
  /**
   * cached releases
   */
  private _releases: Map<'wasm' | SolidityPlatform, Promise<SolidityPlatformReleases>> = new Map();

  /**
   * Create a new SolidityReleaseProvider
   *
   * @param downloadService 
   */
  constructor(private readonly downloadService: IJsonDownloader) {
    //
  }

  /**
   * Get releases available on the given platform
   *
   * @returns   releases for the platform
   */
  getReleases(arch: SolidityArchConfig): Promise<SolidityPlatformReleases> {
    const releases = mapGetOrCreate(
      this._releases,
      arch.isWasm ? 'wasm' : arch.platform,
      () => this
        .downloadService
        .json<SolidityPlatformReleasesRaw>(arch.listUri())
        .then(enrichSolidityBuildList),
    );

    return releases;
  }
}