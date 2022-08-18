require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-waffle")
require("hardhat-gas-reporter")
require("hardhat-deploy")
require("dotenv").config()
require("hardhat-contract-sizer")
require("solidity-coverage")

module.exports = {
    solidity: {
        version: "0.8.9",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 1337,
            blockConfirmations: 1,
        },
        mumbai: {
            chainId: 80001,
            url: process.env.MUMBAI_URL || "",
            accounts: [process.env.PRIVATE_KEY],
            blockConfirmations: 6,
        },
        // polygon: {chainId: 137},
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        gasPrice: 100,
        noColors: true,
        coinmarketcap: process.env.COINMARKETCAP_API,
        outputFile: "gas-report.txt",
    },
    etherscan: {
        apiKey: {
            polygonMumbai: process.env.POLYGONSCAN_API_KEY,
            polygon: process.env.POLYGONSCAN_API_KEY,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
}
