const { run } = require("hardhat")

const verify = async (contractAddress, arguments) => {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: arguments,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verfied!")
        } else {
            console.log(e)
        }
    }
}

module.exports = { verify }
