const networkConfig = {
    1337: {
        name: "hardhat",
    },
    80001: {
        name: "mumbai",
    },
    137: {
        name: "polygon",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
