const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = [
        "FakeCompanyLLC",
        "DEFCL",
        200,
        deployer,
        [deployer],
        [ethers.utils.parseEther("30")],
    ]

    await deploy("TokenizedEquity", {
        from: deployer,
        gasLimit: 30000000,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.POLYGONSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(tokenizedEquity.address, args)
    }
}

module.exports.tags = ["equity"]
