import { SolidityPlatform, SOLIDITY_PLATFORM_ARCHS, SOLIDITY_WASM_ARCH } from "../libs/solidity";
import { DownloadService } from "./download.service";
import { SolidityReleaseProvider } from "./solidity-release.provider";

describe('SolidityReleaseProvider', () => {
  let provider: SolidityReleaseProvider;

  beforeEach(async () => {
    const downloadService = new DownloadService();
    provider = new SolidityReleaseProvider(downloadService);
  });

  it('should work on LinuxAmd64', async () => {
    const releases = await provider.getReleases(SOLIDITY_PLATFORM_ARCHS[SolidityPlatform.LinuxAmd64]);
    expect(releases.builds).toBeInstanceOf(Array);
    expect(releases.releases).toBeInstanceOf(Object);
    expect(typeof releases.latestRelease).toBe('string')
    expect(releases.buildsByLongVersion).toBeInstanceOf(Map);
    expect(releases.buildsByVersion).toBeInstanceOf(Map);
  });

  it('should work on MacosAmd64', async () => {
    const releases = await provider.getReleases(SOLIDITY_PLATFORM_ARCHS[SolidityPlatform.MacosAmd64]);
    expect(releases.builds).toBeInstanceOf(Array);
    expect(releases.releases).toBeInstanceOf(Object);
    expect(typeof releases.latestRelease).toBe('string')
    expect(releases.buildsByLongVersion).toBeInstanceOf(Map);
    expect(releases.buildsByVersion).toBeInstanceOf(Map);
  });

  it('should work on Wasm', async () => {
    const releases = await provider.getReleases(SOLIDITY_WASM_ARCH);
    expect(releases.builds).toBeInstanceOf(Array);
    expect(releases.releases).toBeInstanceOf(Object);
    expect(typeof releases.latestRelease).toBe('string')
    expect(releases.buildsByLongVersion).toBeInstanceOf(Map);
    expect(releases.buildsByVersion).toBeInstanceOf(Map);
  });
});