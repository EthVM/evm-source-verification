import { getByteCodeMetaData } from "@src/libs/utils";

describe("test for cbor metadata decode", () => {
  it("should properly decode cbor data", () => {
    const runtimebytecode =
      "a2646970667358221220a04ee504cb9ecea20bc630510127d079b9dbd2de97d6e506cee44831b24def9464736f6c63430008090033";
    const decoded = getByteCodeMetaData(Buffer.from(runtimebytecode, "hex"));
    expect(decoded).toEqual({
      ipfs: "/ipfs/QmZ8RiUmYRHRBjBFxR4ZQbaopEorKvTkizBNFTYjC328sV",
      solc: "0.8.9",
    });
  });
});
