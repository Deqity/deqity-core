const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        const args = [
            "FakeCompanyLLC",
            "DEFCL",
            "abc",
            200,
            deployer,
            [deployer],
            [ethers.utils.parseEther("30")],
        ]

        await deploy("ExposedTokenizedEquity", {
            from: deployer,
            gasLimit: 30000000,
            args: args,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
    }
}

module.exports.tags = ["exposedEquity"]
