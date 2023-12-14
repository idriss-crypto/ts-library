export type Abi = {
  name: string;
  type: "function" | "constructor" | "event" | "fallback";
  inputs?: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
  constant?: boolean;
  payable?: boolean;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
};
