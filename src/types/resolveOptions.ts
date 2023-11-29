export type ResolveOptions = {
    coin?: "ETH" | "BNB" | "USDT" | "USDC" | "ELA" | "MATIC" | "ERC20" | "BTC" | "SOL" | null,
    network?: "evm" | "btc" | "sol" | null,
    walletTag?: string | null,
}

export type RequiredResolveOptions = {
    coin: "ETH" | "BNB" | "USDT" | "USDC" | "ELA" | "MATIC" | "ERC20" | "BTC" | "SOL",
    network: "evm" | "btc" | "sol",
    walletTag: string,
}

