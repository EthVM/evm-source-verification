import { getByteCodeMetaData } from "@src/libs/utils";

describe("test for cbor metadata decode", () => {
  it("should properly decode cbor data", () => {
    const runtimebytecode =
      "08636020830186613dca565b6158706040830185613a82565b61587d6060830184613df4565b95945050505050565b7f1901000000000000000000000000000000000000000000000000000000000000600082015250565b60006158bc60028361574f565b91506158c782615886565b600282019050919050565b6000819050919050565b6158ed6158e882613c4d565b6158d2565b82525050565b60006158fe826158af565b915061590a82856158dc565b60208201915061591a82846158dc565b6020820191508190509392505050565b600060808201905061593f6000830187613a82565b61594c6020830186613a82565b6159596040830185613dca565b818103606083015261596b8184613d6f565b905095945050505050565b60008151905061598581613829565b92915050565b6000602082840312156159a1576159a06137f3565b5b60006159af84828501615976565b91505092915050565b7f4552433732314d657461646174613a2055524920717565727920666f72206e6f60008201527f6e6578697374656e7420746f6b656e0000000000000000000000000000000000602082015250565b6000615a14602f836138c3565b9150615a1f826159b8565b604082019050919050565b60006020820190508181036000830152615a4381615a07565b9050919050565b6000615a5582613a0d565b9150615a6083613a0d565b925082615a7057615a6f614c9d565b5b828206905092915050565b7f4552433732313a206d696e7420746f20746865207a65726f2061646472657373600082015250565b6000615ab16020836138c3565b9150615abc82615a7b565b602082019050919050565b60006020820190508181036000830152615ae081615aa4565b9050919050565b7f4552433732313a20746f6b656e20616c7265616479206d696e74656400000000600082015250565b6000615b1d601c836138c3565b9150615b2882615ae7565b602082019050919050565b60006020820190508181036000830152615b4c81615b10565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603160045260246000fdfe4d6574615472616e73616374696f6e2875696e74323536206e6f6e63652c616464726573732066726f6d2c62797465732066756e6374696f6e5369676e61747572652968747470733a2f2f657468626c6f636b73646174612e6d65776170692e696f2f636f6e74726163742f6d657461a2646970667358221220a04ee504cb9ecea20bc630510127d079b9dbd2de97d6e506cee44831b24def9464736f6c63430008090033";
    const decoded = getByteCodeMetaData(Buffer.from(runtimebytecode, "hex"));
    expect(decoded).toEqual({
      ipfs: "/ipfs/QmZ8RiUmYRHRBjBFxR4ZQbaopEorKvTkizBNFTYjC328sV",
      solc: "0.8.9",
    });
  });
});
