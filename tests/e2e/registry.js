const { ethers } = require("ethers");
const {
    IdrissCrypto,
    Authorization,
    CreateOTPResponse,
    WrongOTPException,
    AuthorizationTestnet,
    CreateOTPResponseTestnet,
    WrongOTPExceptionTestnet,
} = require("../../lib");
const assert = require("assert");
const { BaseIdrissCrypto } = require("../../lib/baseIdrissCrypto");

const Web3 = require("web3");
const { Web3ProviderAdapter } = require("../../lib/web3Provider");

const createProvider = async () => {
    const web3Provider = Web3ProviderAdapter.fromWeb3(new Web3(new Web3.providers.HttpProvider("https://polygon-rpc.com/")));
    // const web3Provider = Web3ProviderAdapter.fromEthersV5(new ethers.providers.JsonRpcProvider({url: "https://polygon-rpc.com/" }))
    const obj = new IdrissCrypto({ web3Provider: web3Provider });
    return obj;
};

describe("translating address", () => {
    it("Email", async () => {
        const obj = await createProvider();
        const resultAddress = await obj.resolve("hello@idriss.xyz");
        assert.equal(
            resultAddress["Metamask ETH"],
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
        );
        assert.equal(
            resultAddress["Coinbase BTC"],
            "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh",
        );
    }).timeout(10000);

    it("Phone", async () => {
        const obj = await createProvider();
        const resultPhone = await obj.resolve("+16506655942");
        assert.equal(
            resultPhone["Phantom SOL"],
            "6GmzRK2qLhBPK2WwYM14EGnxh95jBTsJGXMgFyM3VeVk",
        );
        assert.equal(
            resultPhone["Essentials ELA"],
            "EL4bLnZALyJKkoEf99qjZMrKVresHU76JU",
        );
        assert.equal(
            resultPhone["Binance BTC"],
            "1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz",
        );
    }).timeout(10000);

    it("Twitter", async () => {
        const obj = await createProvider();
        const resultTwitter = await obj.resolve("@IDriss_xyz");
        assert.equal(
            resultTwitter["Metamask ETH"],
            "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9",
        );
        assert.equal(
            resultTwitter["Coinbase ETH"],
            "0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac",
        );
        assert.equal(
            resultTwitter["Argent ETH"],
            "0x4B994A4b85378906B3FE9C5292C749f79c9aD661",
        );
        assert.equal(
            resultTwitter["Tally ETH"],
            "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d",
        );
        assert.equal(
            resultTwitter["Trust ETH"],
            "0xE297b1E893e7F8849413D8ee7407DB343979A449",
        );
        assert.equal(
            resultTwitter["Rainbow ETH"],
            "0xe10A2331Ac5498e7544579167755d6a756786a9F",
        );
    }).timeout(10000);

    it("Basic request 2", async () => {
        const obj = await createProvider();
        const resultTwitter = await obj.resolve("@idriss_xyz");
        assert.equal(
            resultTwitter["Tally ETH"],
            "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d",
        );
    }).timeout(10000);
    it("Parametrized request 1", async () => {
        const obj = await createProvider();
        const resultEmail = await obj.resolve("hello@idriss.xyz", {
            network: "btc",
            coin: "BTC",
        });
        assert.equal(
            resultEmail["Coinbase BTC"],
            "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh",
        );
        assert(Object.keys(resultEmail).every((x) => x.includes("BTC")));
        const resultPhone = await obj.resolve("+16506655942", {
            network: "btc",
            coin: "ELA",
        });
        assert.equal(
            resultPhone["Essentials ELA"],
            "EL4bLnZALyJKkoEf99qjZMrKVresHU76JU",
        );
        assert(Object.keys(resultPhone).every((x) => x.includes("ELA")));
        const resultTwitter = await obj.resolve("@IDriss_xyz", {
            network: "evm",
            coin: "ETH",
        });
        assert.equal(
            resultTwitter["Metamask ETH"],
            "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9",
        );
        assert(Object.keys(resultTwitter).every((x) => x.includes("ETH")));
     }).timeout(10000);

    it("Parametrized request 2", async () => {
        const obj = await createProvider();
        const resultEmail = await obj.resolve("hello@idriss.xyz", { coin: "BTC" });
        assert.equal(
            resultEmail["Coinbase BTC"],
            "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh",
        );
        assert.equal(Object.keys(resultEmail).length, 1);
        const resultPhone = await obj.resolve("+16506655942", { coin: "BTC" });
        assert.equal(
            resultPhone["Binance BTC"],
            "1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz",
        );
        assert.equal(Object.keys(resultPhone).length, 1);
        const resultTwitter = await obj.resolve("@IDriss_xyz", { coin: "ETH" });
        assert.equal(
            resultTwitter["Tally ETH"],
            "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d",
        );
        assert.equal(Object.keys(resultTwitter).length, 6);
    }).timeout(10000);
    it("Empty response", async () => {
        const obj = await createProvider();
        const result = await obj.resolve("not@existing.email");
        assert.deepEqual(result, {});
    }).timeout(10000);

    it("Checking matching input", async () => {
        assert.equal(BaseIdrissCrypto.matchInput("+48123456789"), "phone");
        assert.equal(BaseIdrissCrypto.matchInput("name@gmail.com"), "mail");
        assert.equal(BaseIdrissCrypto.matchInput("name@name.studio"), "mail");
        assert.equal(BaseIdrissCrypto.matchInput("@twitter_username"), "twitter");
        assert.equal(BaseIdrissCrypto.matchInput("something_else"), null);
    });
});

describe("Reversed translation", () => {
    it("Twitter2", async () => {
        const obj = await createProvider();

        const result1 = await obj.reverseResolve(
            "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9",
        );
        assert.equal(result1, "@idriss_xyz");
    }).timeout(10000);
});

describe("Authorization", () => {
    it("Twitter Create", async () => {
        const secretWord = Math.random().toString();
        const result = await Authorization.CreateOTP(
            "Metamask ETH",
            "@IDriss_xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponse);
        assert(result.triesLeft == 3);
        assert(result.nextStep == "validateOTP");
        assert(result.address == "0x11E9F9344A9720d2B2B5F0753225bb805161139B");
        assert(result.twitterId == "1416199220978089987");
        assert(/^[0-9a-fA-F]{64}$/.test(result.hash));
        assert(result.twitterMsg.includes("#IDriss Verification-ID"));
    }).timeout(10000);
    it("Wrong OTP", async () => {
        const secretWord = Math.random().toString();
        const result = await Authorization.CreateOTP(
            "Metamask ETH",
            "hello@idriss.xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponse);
        assert(result.triesLeft == 3);
        assert(result.nextStep == "validateOTP");
        assert(result.address == "0x11E9F9344A9720d2B2B5F0753225bb805161139B");
        //assert(result.twitterId=="0");
        assert(/^[0-9a-fA-F]{64}$/.test(result.hash));
        let error = null;
        try {
            await Authorization.ValidateOTP("0", result.sessionKey, secretWord);
        } catch (e) {
            error = e;
        }
        assert(error instanceof WrongOTPException);
    }).timeout(10000);
    it("Payment error", async () => {
        const secretWord = Math.random().toString();
        const result = await Authorization.CreateOTP(
            "Metamask ETH",
            "hello@idriss.xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponse);
        let error = null;
        try {
            await Authorization.CheckPayment("MATIC", result.sessionKey);
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    }).timeout(10000);
});

describe("AuthorizationTestnet", () => {
    it("Twitter Create", async () => {
        const secretWord = Math.random().toString();
        const result = await AuthorizationTestnet.CreateOTP(
            "Metamask ETH",
            "@IDriss_xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponseTestnet);
        assert(result.triesLeft == 3);
        assert(result.nextStep == "validateOTP");
        assert(result.address == "0x11E9F9344A9720d2B2B5F0753225bb805161139B");
        assert(result.twitterId == "1416199220978089987");
        assert(result.network == "mumbai");
        assert(/^[0-9a-fA-F]{64}$/.test(result.hash));
        assert(result.twitterMsg.includes("#IDriss Verification-ID"));
    }).timeout(10000);
    it("Wrong OTP", async () => {
        const secretWord = Math.random().toString();
        const result = await AuthorizationTestnet.CreateOTP(
            "Metamask ETH",
            "hello@idriss.xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponseTestnet);
        assert(result.triesLeft == 3);
        assert(result.nextStep == "validateOTP");
        assert(result.address == "0x11E9F9344A9720d2B2B5F0753225bb805161139B");
        //assert(result.twitterId=="0");
        assert(/^[0-9a-fA-F]{64}$/.test(result.hash));
        let error = null;
        try {
            await AuthorizationTestnet.ValidateOTP(
                "0",
                result.sessionKey,
                secretWord,
            );
        } catch (e) {
            error = e;
        }
        assert(error instanceof WrongOTPExceptionTestnet);
    }).timeout(10000);
    it("Payment error", async () => {
        const secretWord = Math.random().toString();
        const result = await AuthorizationTestnet.CreateOTP(
            "Metamask ETH",
            "hello@idriss.xyz",
            "0x11E9F9344A9720d2B2B5F0753225bb805161139B",
            secretWord,
        );
        assert(result instanceof CreateOTPResponseTestnet);
        let error = null;
        try {
            await AuthorizationTestnet.CheckPayment("MATIC", result.sessionKey);
        } catch (e) {
            error = e;
        }
        assert(error instanceof Error);
    }).timeout(10000);
});
