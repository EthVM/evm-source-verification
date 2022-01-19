type CborDecodedType = {
  ipfs?: Buffer;
  bzzr0?: Buffer;
  bzzr1?: Buffer;
  solc?: Buffer;
};

type CborDataType = {
  ipfs?: string;
  bzzr0?: string;
  bzzr1?: string;
  solc?: string;
};

type OpCodeType = {
  code: string;
  data?: Buffer;
};
