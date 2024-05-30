export const CONTRACTS_ADDRESSES = {
  zero: '0x0000000000000000000000000000000000000000',
  idrissRegistry: '0x2EcCb53ca2d4ef91A79213FDDF3f8c2332c2a814',
  idrissMultipleRegistry: '0xa179BF6f32483A82d4BD726068EfD93E29f3c930',
  idrissReverseMapping: '0x561f1b5145897A52A6E94E4dDD4a29Ea5dFF6f64',
  idrissSendToAnyone: '0xf333EDE8D49dD100F02c946809C9F5D9867D10C0',
  priceOracle: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  idrissTipping: '0xf333EDE8D49dD100F02c946809C9F5D9867D10C0',
} as const;

export type AddressName = keyof typeof CONTRACTS_ADDRESSES;
export type ContractsAddresses = Record<AddressName, string>;
