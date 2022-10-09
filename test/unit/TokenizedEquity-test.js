const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { expect, assert } = require("chai")

describe("TokenizedEquity", async function () {
    let deployer, equity
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["equity"])
        equity = await ethers.getContract("TokenizedEquity", deployer)
    })

    describe("constructor", async function () {
        it("sets proper values", async function () {
            const status = await equity.getContractStatus()
            const adminFee = await equity.i_adminFee()
            const factory = await equity.i_factory()
            assert.equal(status[0], 0)
            assert.equal(status[1], true)
            assert.equal(adminFee, 200)
            assert.equal(factory, deployer)
        })
        it("calls initalizeEquity", async function () {
            const userShares = await equity.shareholdersInfo(deployer)
            assert.equal(
                userShares.shares.toString(),
                ethers.utils.parseEther("30")
            )
        })
        it("transfers ownership to initlizer", async function () {
            const owner = await equity.owner()
            assert.equal(owner, deployer)
        })
    })

    describe("startDillutionSale", async function () {
        it("fails if there is an ongoing sale", async function () {
            await equity.startDillutionSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("10")
            )
            expect(
                equity.startDillutionSale(
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("10")
                )
            ).to.be.revertedWith("Sale has already started")
        })
        it("fails if zero new shares are set for sale", async function () {
            expect(
                equity.startDillutionSale(
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("10")
                )
            ).to.be.revertedWith("Zero new shares set for sale")
        })
        it("fails if no share price is set", async function () {
            expect(
                equity.startDillutionSale(
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("0")
                )
            ).to.be.revertedWith("Undefined share price set")
        })
        it("starts sale and updates status variables", async function () {
            const preShares = await equity.totalShares()
            await equity.startDillutionSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("10")
            )
            const price = await equity.dillutionSharePrice()
            const postShares = await equity.totalShares()
            const status = await equity.getContractStatus()
            assert.equal(price.toString(), ethers.utils.parseEther("10"))
            assert.equal(
                postShares.toString(),
                preShares.add(ethers.utils.parseEther("10"))
            )
            assert.equal(status[0], 1)
        })
    })

    describe("buyDillutionShares", async function () {
        it("fails if there is no active sale", async function () {
            expect(equity.buyDillutionShares()).to.be.revertedWith(
                "No active sale"
            )
        })
        it("fails if purchase quantity is greater than supply", async function () {
            await equity.startDillutionSale(
                ethers.utils.parseEther("1"),
                ethers.utils.parseEther("10")
            )
            expect(
                equity.buyDillutionShares(ethers.utils.parseEther("10"), {
                    value: ethers.utils.parseEther("10"),
                })
            ).to.be.revertedWith("Cannot buy more shares than available")
        })
        it("fails if an initial shareholder tries to buy", async function () {
            await equity.startDillutionSale(
                ethers.utils.parseEther("1"),
                ethers.utils.parseEther("10")
            )
            expect(
                equity.buyDillutionShares(ethers.utils.parseEther("1"), {
                    value: ethers.utils.parseEther("10"),
                })
            ).to.be.revertedWith(
                "Intital Shareholders cannot buy dillution shares"
            )
        })
        it("fails if msg value is incorrect", async function () {
            await equity.startDillutionSale(
                ethers.utils.parseEther("1"),
                ethers.utils.parseEther("10")
            )
            expect(
                equity.buyDillutionShares(ethers.utils.parseEther("1"), {
                    value: ethers.utils.parseEther("1"),
                })
            ).to.be.revertedWith("Input value doesnt match share price")
        })
        it("mint tokens and updates status variables", async function () {
            const accounts = await ethers.getSigners()

            await equity.startDillutionSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )
            const depPreBal = await accounts[0].getBalance()

            equity = await equity.connect(accounts[1])
            await equity.buyDillutionShares(ethers.utils.parseEther("5"), {
                value: ethers.utils.parseEther("5"),
            })

            const bal = await equity.balanceOf(accounts[1].address)
            const address = await equity.shareHolders(1)
            const depPostBal = await accounts[0].getBalance()

            const usr = await equity.shareholdersInfo(accounts[1].address)
            const shrHlderShrs = usr.shares
            const usrEquity = usr.equity

            const totalSupply = await equity.totalSupply()

            assert.equal(
                bal.toString(),
                ethers.utils.parseEther("5").toString()
            )
            assert.equal(address, accounts[1].address)
            assert.equal(
                depPostBal.sub(depPreBal).toString(),
                ethers.utils.parseEther("5").div(200).toString()
            )
            assert.equal(shrHlderShrs.toString(), bal.toString())
            assert.equal(
                usrEquity.toString(),
                bal
                    .mul(ethers.utils.parseEther("1"))
                    .div(totalSupply)
                    .toString()
            )
        })
        it("ends sale if max supply is reached", async function () {
            const accounts = await ethers.getSigners()

            await equity.startDillutionSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )

            equity = await equity.connect(accounts[1])
            await equity.buyDillutionShares(ethers.utils.parseEther("10"), {
                value: ethers.utils.parseEther("10"),
            })

            const status = await equity.getContractStatus()
            assert.equal(status[0], 0)
        })
    })

    describe("startPeerToPeerSale", async function () {
        it("fails if user already started a sale", async function () {
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("1")
            )
            expect(
                equity.startPeerToPeerSale(
                    ethers.utils.parseEther("5"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("Seller already has sale started")
        })
        it("fails if zero quantity is inputed", async function () {
            expect(
                equity.startPeerToPeerSale(
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("Zero value quantity input")
        })
        it("fails if zero share value is inputed", async function () {
            expect(
                equity.startPeerToPeerSale(
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("0")
                )
            ).to.be.revertedWith("Zero value share price input")
        })
        it("fails if user doesnt have enough shares to sell", async function () {
            const accounts = await ethers.getSigners()
            equity = await equity.connect(accounts[1])
            expect(
                equity.startPeerToPeerSale(
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("User does not have enough shares to sell")
        })
        it("updates status variables and approves tokens", async function () {
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )

            const sale = await equity.privateSales(deployer)
            const sharePrice = sale.sharePrice
            const shares = sale.sharesForSale
            const approved = await equity.allowance(deployer, equity.address)

            assert.equal(sharePrice.toString(), ethers.utils.parseEther("1"))
            assert.equal(shares.toString(), ethers.utils.parseEther("10"))
            assert.equal(approved.toString(), 2 ** 256 - 1)
        })
    })

    describe("alterPeerToPeerSale", async function () {
        it("fails if caller isnt the seller", async function () {
            const accounts = await ethers.getSigners()

            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )
            equity = await equity.connect(accounts[1])
            expect(
                equity.alterPeerToPeerSale(
                    deployer,
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("Only the seller can motify their sale")
        })
        it("fails if seller doesnt have a sale", async function () {
            expect(
                equity.alterPeerToPeerSale(
                    deployer,
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("Seller doesnt have a sale")
        })
        it("fails if seller doesnt have enough balance", async function () {
            expect(
                equity.alterPeerToPeerSale(
                    deployer,
                    ethers.utils.parseEther("50"),
                    ethers.utils.parseEther("1")
                )
            ).to.be.revertedWith("User does not have enough shares to sell")
        })
        it("ends sale if inputed quantity is zero", async function () {
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )
            await equity.alterPeerToPeerSale(
                deployer,
                ethers.utils.parseEther("0"),
                ethers.utils.parseEther("1")
            )

            const sale = await equity.privateSales(deployer)
            const sharePrice = sale.sharePrice
            const shares = sale.sharesForSale

            assert.equal(sharePrice.toString(), 0)
            assert.equal(shares.toString(), 0)
        })
        it("updates status variables", async function () {
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )
            await equity.alterPeerToPeerSale(
                deployer,
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("2")
            )

            const sale = await equity.privateSales(deployer)
            const sharePrice = sale.sharePrice
            const shares = sale.sharesForSale

            assert.equal(sharePrice.toString(), ethers.utils.parseEther("2"))
            assert.equal(shares.toString(), ethers.utils.parseEther("5"))
        })
    })

    describe("buyPeerToPeerShares", async function () {
        it("fails if inputed quantity is higher than listed shares", async function () {
            const accounts = await ethers.getSigners()
            equity = await equity.connect(accounts[1])

            expect(
                equity.buyPeerToPeerShares(
                    deployer,
                    ethers.utils.parseEther("10")
                )
            ).to.be.revertedWith(
                "Inputed seller doesnt have enough shares listed"
            )
        })
        it("fails if the msg value doesnt align with sale price", async function () {
            const accounts = await ethers.getSigners()

            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )
            equity = await equity.connect(accounts[1])

            expect(
                equity.buyPeerToPeerShares(
                    deployer,
                    ethers.utils.parseEther("10"),
                    { value: ethers.utils.parseEther("110") }
                )
            ).to.be.revertedWith("Invaild msg value")
        })
        it("successfully completes the transaction, sends the fee, updates status variables , and deletes sale if quantity is equal to zero", async function () {
            const accounts = await ethers.getSigners()

            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )

            equity = await equity.connect(accounts[1])
            await equity.buyPeerToPeerShares(
                deployer,
                ethers.utils.parseEther("5"),
                { value: ethers.utils.parseEther("5") }
            )
            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("1")
            )

            const depPreBal = await accounts[0].getBalance()
            const acc1PreBal = await accounts[1].getBalance()
            const acc2EquityPreBal = await equity.balanceOf(accounts[2].address)
            equity = await equity.connect(accounts[2])

            await equity.buyPeerToPeerShares(
                accounts[1].address,
                ethers.utils.parseEther("5"),
                { value: ethers.utils.parseEther("5") }
            )

            const depPostBal = await accounts[0].getBalance()
            const acc1PostBal = await accounts[1].getBalance()
            const acc2EquityPostBal = await equity.balanceOf(
                accounts[2].address
            )
            const holder1 = await equity.shareHolders(1)
            const holder2 = await equity.shareHolders(2)

            const sale = await equity.privateSales(deployer)
            const remainingSharesSaleDep = sale.sharesForSale
            const sale1 = await equity.privateSales(accounts[1].address)
            const remainingSharesSaleAcc1 = sale1.sharesForSale

            assert.equal(
                depPostBal.sub(depPreBal).toString(),
                ethers.utils.parseEther("5").div(200).toString()
            )
            assert.equal(
                acc1PostBal.sub(acc1PreBal).toString(),
                ethers.utils
                    .parseEther("5")
                    .sub(ethers.utils.parseEther("5").div(200))
                    .toString()
            )
            assert.equal(
                acc2EquityPostBal.sub(acc2EquityPreBal).toString(),
                ethers.utils.parseEther("5")
            )
            assert.equal(holder1, 0x000000000000000000)
            assert.equal(holder2, accounts[2].address)
            assert.equal(
                remainingSharesSaleDep.toString(),
                ethers.utils.parseEther("5")
            )
            assert.equal(
                remainingSharesSaleAcc1.toString(),
                ethers.utils.parseEther("0")
            )
        })
    })

    describe("update", async function () {
        it("updates all status varaibles", async function () {
            const accounts = await ethers.getSigners()

            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )
            await exposed.transfer(
                accounts[1].address,
                ethers.utils.parseEther("30")
            )

            exposed = await exposed.connect(accounts[1])
            await exposed._update(true)

            const depShareHolder = await exposed.shareHolders(0)
            const holder = await exposed.shareholdersInfo(accounts[1].address)
            const shares = holder.shares
            const bal = await exposed.balanceOf(accounts[1].address)
            const contractBal = await exposed.totalSupply()
            const equity = holder.equity
            const initEquity = holder.initialEquity

            assert.equal(depShareHolder, 0)
            assert.equal(shares.toString(), bal.toString())
            assert.equal(
                equity.toString(),
                bal
                    .mul(ethers.utils.parseEther("1"))
                    .div(contractBal)
                    .toString()
            )
            assert.equal(
                initEquity.toString(),
                bal
                    .mul(ethers.utils.parseEther("1"))
                    .div(contractBal)
                    .toString()
            )
        })
    })

    describe("initilizeEquity", async function () {
        it("fails if contract is already initilized", async function () {
            const accounts = await ethers.getSigners()

            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )

            expect(
                exposed._initilizeEquity(
                    [deployer],
                    [ethers.utils.parseEther("30")]
                )
            ).to.be.revertedWith("Equity already initilized")
        })
        it("mints the correct amount of tokens and updated variables", async function () {
            const bal = await equity.balanceOf(deployer)
            const status = await equity.getContractStatus()
            const totalShares = await equity.totalShares()
            const shareholder = await equity.shareHolders(0)
            const inital = await equity.initlalShareHolders(0)
            assert.equal(status[1], true)
            assert.equal(
                bal.toString(),
                ethers.utils.parseEther("30").toString()
            )
            assert.equal(ethers.utils.formatEther(totalShares.toString()), 30)
            assert.equal(shareholder, deployer)
            assert.equal(inital, deployer)
        })
    })

    describe("endDillutionSale", async function () {
        it("fails if there is not a current sale", async function () {
            const accounts = await ethers.getSigners()

            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )

            expect(exposed._endDillutionSale()).to.be.revertedWith(
                "No current sale"
            )
        })
        it("fails if total shares is lower than total supply", async function () {
            const accounts = await ethers.getSigners()

            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )
            await exposed.startDillutionSale(
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("1")
            )

            expect(exposed._endDillutionSale()).to.be.revertedWith(
                "Still supply left to be sold"
            )
        })
        it("pays shareholders and updates status variables", async function () {
            const accounts = await ethers.getSigners()

            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )
            await exposed.transfer(
                accounts[6].address,
                ethers.utils.parseEther("10")
            )
            await exposed.startDillutionSale(
                ethers.utils.parseEther("5"),
                ethers.utils.parseEther("10")
            )

            const depPreBal = await accounts[0].getBalance()
            const holderInfo = await exposed.shareholdersInfo(deployer)
            const depEq = holderInfo.initialEquity

            const hlderPreBal = await accounts[6].getBalance()
            const holderInfo1 = await exposed.shareholdersInfo(
                accounts[6].address
            )
            const hlderEq = holderInfo1.initialEquity

            exposed = await exposed.connect(accounts[1])
            await exposed.buyDillutionShares(ethers.utils.parseEther("5"), {
                value: ethers.utils.parseEther("50"),
            })

            const depPostBal = await accounts[0].getBalance()
            const hlderPostBal = await accounts[6].getBalance()

            const status = await exposed.getContractStatus()
            const holder = await exposed.initlalShareHolders(2)

            console.log(hlderPostBal.sub(hlderPreBal).toString())

            //fee is sent to deplyer since he is acting as factory
            assert.equal(
                depPostBal.sub(depPreBal).toString(),
                depEq
                    .mul(ethers.utils.parseEther("50"))
                    .div(ethers.utils.parseEther("1"))
                    .toString()
            )
            assert.equal(
                hlderPostBal.sub(hlderPreBal).toString(),
                hlderEq
                    .mul(
                        ethers.utils
                            .parseEther("50")
                            .sub(ethers.utils.parseEther("50").div(200))
                    )
                    .div(ethers.utils.parseEther("1"))
                    .toString()
            )
            assert.equal(status[0], 0)
            assert.equal(holder, accounts[1].address)
        })
    })

    describe("endPeerToPeerSale", async function () {
        it("fails if user has no active sale", async function () {
            await deployments.fixture(["exposedEquity"])
            let exposed = await ethers.getContract(
                "ExposedTokenizedEquity",
                deployer
            )

            expect(exposed._endPeerToPeerSale(deployer)).to.be.revertedWith(
                "User has no active sale"
            )
        })
        it("deletes sale variables", async function () {
            const accounts = await ethers.getSigners()

            await equity.startPeerToPeerSale(
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("1")
            )

            equity = await equity.connect(accounts[1])
            await equity.buyPeerToPeerShares(
                accounts[0].address,
                ethers.utils.parseEther("10"),
                {
                    value: ethers.utils.parseEther("10"),
                }
            )

            const sale = await equity.privateSales(accounts[0].address)

            assert.equal(
                sale.seller,
                "0x0000000000000000000000000000000000000000"
            )
        })
    })
})
