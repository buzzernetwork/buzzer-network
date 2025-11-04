import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Buzzer Network contracts to BASE...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // For now, we'll use deployer as authorized backend
  // In production, this should be a separate address
  const authorizedBackend = deployer.address;

  // Deploy PaymentEscrow
  console.log("📦 Deploying PaymentEscrow...");
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const paymentEscrow = await PaymentEscrow.deploy(authorizedBackend);
  await paymentEscrow.waitForDeployment();
  const paymentEscrowAddress = await paymentEscrow.getAddress();
  console.log("✅ PaymentEscrow deployed to:", paymentEscrowAddress);

  // Deploy PublisherPayout
  console.log("\n📦 Deploying PublisherPayout...");
  const PublisherPayout = await ethers.getContractFactory("PublisherPayout");
  const publisherPayout = await PublisherPayout.deploy(authorizedBackend);
  await publisherPayout.waitForDeployment();
  const publisherPayoutAddress = await publisherPayout.getAddress();
  console.log("✅ PublisherPayout deployed to:", publisherPayoutAddress);

  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PaymentEscrow:", paymentEscrowAddress);
  console.log("PublisherPayout:", publisherPayoutAddress);
  console.log("Authorized Backend:", authorizedBackend);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("💡 Next steps:");
  console.log("1. Update .env with contract addresses");
  console.log("2. Verify contracts on BaseScan");
  console.log("3. Update backend with contract addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

