const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu triển khai tất cả contracts lên Sepolia...");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying contracts with account:", deployer?.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(60));

  // Sử dụng Chainlink ETH/USD Price Feed thật trên Sepolia
  const sepoliaETHUSDPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  console.log("🔗 Sử dụng Chainlink ETH/USD Price Feed:", sepoliaETHUSDPriceFeed);
  console.log();

  // 1. Deploy RewardToken
  console.log("📦 1. Deploying RewardToken...");
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens initial supply
  const rewardToken = await RewardToken.deploy(initialSupply);
  await rewardToken.waitForDeployment();
  console.log("✅ RewardToken deployed to:", rewardToken.target);
  console.log("💰 Initial supply:", ethers.formatEther(initialSupply), "REWARD tokens");
  console.log();

  // 2. Deploy NFTCollection
  console.log("📦 2. Deploying NFTCollection...");
  const NFTCollection = await ethers.getContractFactory("NFTCollection");
  const nftCollection = await NFTCollection.deploy();
  await nftCollection.waitForDeployment();
  console.log("✅ NFTCollection deployed to:", nftCollection.target);
  console.log();

  // 3. Deploy MarketPlace với Chainlink Price Feed
  console.log("📦 3. Deploying MarketPlace...");
  const Marketplace = await ethers.getContractFactory("MarketPlace");
  const marketplace = await Marketplace.deploy(sepoliaETHUSDPriceFeed);
  await marketplace.waitForDeployment();
  console.log("✅ MarketPlace deployed to:", marketplace.target);
  console.log();

  // 4. Deploy DynamicPricing
  console.log("📦 4. Deploying DynamicPricing...");
  const DynamicPricing = await ethers.getContractFactory("DynamicPricing");
  const dynamicPricing = await DynamicPricing.deploy(
    sepoliaETHUSDPriceFeed,
    deployer.address // Fee recipient
  );
  await dynamicPricing.waitForDeployment();
  console.log("✅ DynamicPricing deployed to:", dynamicPricing.target);
  console.log();

  // 5. Deploy AutomatedRewards
  console.log("📦 5. Deploying AutomatedRewards...");
  const AutomatedRewards = await ethers.getContractFactory("AutomatedRewards");
  const rewardPoolPerPeriod = ethers.parseEther("1000"); // 1000 REWARD tokens per period
  const automatedRewards = await AutomatedRewards.deploy(
    rewardToken.target,
    marketplace.target,
    rewardPoolPerPeriod
  );
  await automatedRewards.waitForDeployment();
  console.log("✅ AutomatedRewards deployed to:", automatedRewards.target);
  console.log();

  // 6. Deploy RarityVerification
  console.log("📦 6. Deploying RarityVerification...");
  const RarityVerification = await ethers.getContractFactory("RarityVerification");
  const rarityVerification = await RarityVerification.deploy();
  await rarityVerification.waitForDeployment();
  console.log("✅ RarityVerification deployed to:", rarityVerification.target);
  console.log();

  // Setup permissions cho AutomatedRewards
  console.log("⚙️  Setting up permissions...");
  try {
    // Transfer một số RewardToken cho AutomatedRewards contract
    const transferAmount = ethers.parseEther("10000"); // 10,000 REWARD tokens
    await rewardToken.transfer(automatedRewards.target, transferAmount);
    console.log("✅ Transferred", ethers.formatEther(transferAmount), "REWARD tokens to AutomatedRewards");
  } catch (error) {
    console.warn("⚠️  Warning: Could not transfer reward tokens:", error.message);
  }

  console.log();
  console.log("🎉 DEPLOYMENT COMPLETED!");
  console.log("=".repeat(60));
  console.log("📋 CONTRACT ADDRESSES SUMMARY:");
  console.log("=".repeat(60));
  console.log("RewardToken        :", rewardToken.target);
  console.log("NFTCollection      :", nftCollection.target);
  console.log("MarketPlace        :", marketplace.target);
  console.log("DynamicPricing     :", dynamicPricing.target);
  console.log("AutomatedRewards   :", automatedRewards.target);
  console.log("RarityVerification :", rarityVerification.target);
  console.log("=".repeat(60));
  
  console.log();
  console.log("📝 COPY TO FRONTEND constants/index.ts:");
  console.log("=".repeat(60));
  console.log(`export const CONTRACT_ADDRESSES = {`);
  console.log(`  MARKETPLACE: '${marketplace.target}',`);
  console.log(`  NFT_COLLECTION: '${nftCollection.target}',`);
  console.log(`  DYNAMIC_PRICING: '${dynamicPricing.target}',`);
  console.log(`  AUTOMATED_REWARDS: '${automatedRewards.target}',`);
  console.log(`  RARITY_VERIFICATION: '${rarityVerification.target}',`);
  console.log(`  REWARD_TOKEN: '${rewardToken.target}',`);
  console.log(`} as const;`);
  console.log("=".repeat(60));

  console.log();
  console.log("🔗 CHAINLINK INTEGRATION:");
  console.log("- ETH/USD Price Feed:", sepoliaETHUSDPriceFeed);
  console.log("- Real-time price updates: ✅");
  console.log("- Dynamic fee calculation: ✅");
  console.log("- Automated rewards system: ✅");
  console.log("- NFT rarity verification: ✅");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 