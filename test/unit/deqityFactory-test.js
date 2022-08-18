const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { expect, assert } = require("chai")

describe("DeqityFactory", async function () {
    let deployer, factory
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["factory"])
        factory = await ethers.getContract("DeqityFactory", deployer)
    })

    describe("constructor", async function () {
        it("sets admin fee and admin fee setter", async function () {
            const fee = await factory.adminFee()
            const feeSetter = await factory.adminFeeSetter()
            assert.equal(fee, 200)
            assert.equal(feeSetter, deployer)
        })
    })

    describe("createEquity", async function () {
        it("fails if there is a mismatch between shareholders and shares length", async function () {
            const accounts = await ethers.getSigners()

            expect(
                factory.createEquity(
                    "Fake",
                    "DEFKE",
                    [deployer, accounts[1], accounts[2]],
                    [ethers.utils.parseEther("30")]
                )
            ).to.be.revertedWith(
                "Num of shareholders and coresponding shares mismatch"
            )
        })
        it("fails if no shareholder addresses are entered", async function () {
            expect(
                factory.createEquity(
                    "d",
                    "ddd",
                    [],
                    [ethers.utils.parseEther("30")]
                )
            ).to.be.revertedWith("Shareholder address cant be null")
        })
        it("fails if no shares are entered", async function () {
            expect(
                factory.createEquity("d", "ddd", [deployer], [])
            ).to.be.revertedWith("Shareholder cant have zero shares")
        })
        it("fails if a blank organization name is entered", async function () {
            expect(
                factory.createEquity(
                    "",
                    "ddd",
                    [deployer],
                    [ethers.utils.parseEther("30")]
                )
            ).to.be.revertedWith("Organization name cannot be blank")
        })
        it("fails if user trys to create a contract with repeat name and symbol", async function () {
            await factory.createEquity(
                "Fake",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            expect(
                factory.createEquity(
                    "Fake",
                    "DEFKE",
                    [deployer],
                    [ethers.utils.parseEther("30")]
                )
            ).to.be.revertedWith("Contract already exists with name and symbol")
        })
        it("creates a new contract and updates variables", async function () {
            await factory.createEquity(
                "Fake",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            const address = await factory.equityContracts(0)
            const addressLookup = await factory.getEquityAddress(
                "Fake",
                "DEFKE"
            )
            let equity = await ethers.getContractAt(
                "TokenizedEquity",
                address,
                deployer
            )
            assert.equal(address, equity.address)
            assert.equal(addressLookup, address)
        })
        it("survives stress test", async function () {
            const accounts = await ethers.getSigners()

            //deploy contracts
            await factory.createEquity(
                "Fake Company LLC",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            await factory.createEquity(
                "Not Real Company Co",
                "DENTR",
                [accounts[5].address, deployer],
                [ethers.utils.parseEther("80"), ethers.utils.parseEther("20")]
            )
            await factory.createEquity(
                "Imaginary Inc",
                "DEIMAI",
                [accounts[5].address, accounts[6].address, accounts[7].address],
                [
                    ethers.utils.parseEther("800"),
                    ethers.utils.parseEther("1000"),
                    ethers.utils.parseEther("200"),
                ]
            )
            await factory.createEquity(
                "Unreal LLC",
                "DEUNRL",
                [
                    deployer,
                    accounts[9].address,
                    accounts[15].address,
                    accounts[12].address,
                ],
                [
                    ethers.utils.parseEther("30"),
                    ethers.utils.parseEther("30"),
                    ethers.utils.parseEther("30"),
                    ethers.utils.parseEther("30"),
                ]
            )
            await factory.createEquity(
                "Invalid Existance LLC",
                "DEINVLD",
                [
                    deployer,
                    accounts[10].address,
                    accounts[11].address,
                    accounts[15].address,
                    accounts[16].address,
                ],
                [
                    ethers.utils.parseEther("900"),
                    ethers.utils.parseEther("1500"),
                    ethers.utils.parseEther("250"),
                    ethers.utils.parseEther("3000"),
                    ethers.utils.parseEther("180"),
                ]
            )

            const contracts = await factory.numOfEquityContracts()
            assert.equal(contracts, 5)
        })
    })

    describe("setAdminFee", async function () {
        it("fails if msg sender is not admin fee setter", async function () {
            const accounts = await ethers.getSigners()
            factory = await factory.connect(accounts[10])
            expect(factory.setAdminFee()).to.be.revertedWith(
                "Only fee setter can change admin fee"
            )
        })
        it("fails if the new fee is the same", async function () {
            expect(factory.setAdminFee()).to.be.revertedWith(
                "New fee is the same as previous"
            )
        })
        it("sets a new admin fee", async function () {
            await factory.setAdminFee(300)
            const fee = await factory.adminFee()
            assert.equal(fee, 300)
        })
    })

    describe("setFeeSetter", async function () {
        it("fails if msg sender is not admin fee setter", async function () {
            const accounts = await ethers.getSigners()
            factory = await factory.connect(accounts[10])
            expect(factory.setFeeSetter()).to.be.revertedWith(
                "Only fee setter can change admin fee setter"
            )
        })
        it("fails if new setter is the same", async function () {
            expect(factory.setFeeSetter(deployer)).to.be.revertedWith(
                "New setter is the same as old"
            )
        })
        it("sets a new fee setter", async function () {
            const accounts = await ethers.getSigners()
            await factory.setFeeSetter(accounts[10].address)
            const feeSetter = await factory.adminFeeSetter()
            assert.equal(feeSetter, accounts[10].address)
        })
    })

    describe("withdrawl", async function () {
        it("fails if there are no generated fees", async function () {
            expect(factory.withdrawl()).to.be.revertedWith(
                "No generated fees to withdraw"
            )
        })
        it("transfers fees to admin fee setter", async function () {
            //deploy new equity contract
            await factory.createEquity(
                "Fake",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            const equityAddress = await factory.equityContracts(0)
            let equity = await ethers.getContractAt(
                "TokenizedEquity",
                equityAddress,
                deployer
            )

            //make sale on new contract
            const accounts = await ethers.getSigners()
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("15"),
                ethers.utils.parseEther("1")
            )
            equity = await equity.connect(accounts[10])
            await equity.buyPeerToPeerShares(
                deployer,
                ethers.utils.parseEther("15"),
                {
                    value: ethers.utils.parseEther("1").mul(15),
                }
            )

            //call withdrawl on factory
            const preBal = await accounts[0].getBalance()
            const tx = await factory.withdrawl()
            const transcactionRecipt = await tx.wait(1)
            const postBal = await accounts[0].getBalance()
            assert.equal(
                postBal
                    .add(
                        transcactionRecipt.gasUsed.mul(
                            transcactionRecipt.effectiveGasPrice
                        )
                    )
                    .sub(preBal)
                    .toString(),
                ethers.utils.parseEther("15").div(200).toString()
            )
        })
    })

    describe("getEquityAddress", async function () {
        it("returns contract address of organization's name and symbol", async function () {
            await factory.createEquity(
                "Fake",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            const equityAddress = await factory.equityContracts(0)
            const result = await factory.getEquityAddress("Fake", "DEFKE")
            assert.equal(result, equityAddress)
        })
    })

    describe("numOfEquityContracts", async function () {
        it("returns the amount of equity contracts", async function () {
            await factory.createEquity(
                "Fake",
                "DEFKE",
                [deployer],
                [ethers.utils.parseEther("30")]
            )
            const length = await factory.numOfEquityContracts()
            assert.equal(length, 1)
        })
    })
})
