import { expect } from "chai";
import { ethers } from "hardhat";
import { PaymentEscrow } from "../typechain-types";

describe("PaymentEscrow", function () {
  let paymentEscrow: PaymentEscrow;
  let owner: any;
  let advertiser: any;
  let backend: any;
  let tokenAddress: string;

  beforeEach(async function () {
    [owner, advertiser, backend] = await ethers.getSigners();
    // Use a valid address for ETH (native token address)
    // For native ETH, we'll use a special address or modify contract
    tokenAddress = "0x0000000000000000000000000000000000000001"; // Native ETH constant

    const PaymentEscrowFactory = await ethers.getContractFactory("PaymentEscrow");
    paymentEscrow = await PaymentEscrowFactory.deploy(backend.address);
    await paymentEscrow.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await paymentEscrow.owner()).to.equal(owner.address);
    });

    it("Should set the correct authorized backend", async function () {
      expect(await paymentEscrow.authorizedBackend()).to.equal(backend.address);
    });
  });

  describe("Deposit", function () {
    it("Should deposit funds to campaign", async function () {
      const campaignId = 1;
      const amount = ethers.parseEther("1.0");

      await expect(
        paymentEscrow.connect(advertiser).deposit(campaignId, tokenAddress, { value: amount })
      )
        .to.emit(paymentEscrow, "Deposited")
        .withArgs(campaignId, tokenAddress, amount, advertiser.address);

      expect(await paymentEscrow.getBalance(campaignId, tokenAddress)).to.equal(amount);
    });

    it("Should reject zero amount deposit", async function () {
      await expect(
        paymentEscrow.connect(advertiser).deposit(1, tokenAddress, { value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Spend", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1.0");
      await paymentEscrow.connect(advertiser).deposit(1, tokenAddress, { value: amount });
    });

    it("Should allow authorized backend to spend", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(
        paymentEscrow.connect(backend).spend(1, tokenAddress, amount)
      )
        .to.emit(paymentEscrow, "Spent")
        .withArgs(1, tokenAddress, amount);

      expect(await paymentEscrow.getBalance(1, tokenAddress)).to.equal(ethers.parseEther("0.5"));
      expect(await paymentEscrow.getTotalSpent(1, tokenAddress)).to.equal(amount);
    });

    it("Should reject unauthorized spend", async function () {
      await expect(
        paymentEscrow.connect(advertiser).spend(1, tokenAddress, ethers.parseEther("0.5"))
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1.0");
      await paymentEscrow.connect(advertiser).deposit(1, tokenAddress, { value: amount });
    });

    it("Should allow withdrawal of unused funds", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(
        paymentEscrow.connect(advertiser).withdraw(1, tokenAddress, amount)
      )
        .to.emit(paymentEscrow, "Withdrawn")
        .withArgs(1, tokenAddress, amount, advertiser.address);

      expect(await paymentEscrow.getBalance(1, tokenAddress)).to.equal(ethers.parseEther("0.5"));
    });
  });
});

