const { ethers } = require("hardhat");

async function main() {
  console.log("Bắt đầu triển khai lên Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer?.address);

  // Deploy NFTCollection
  const NFTCollection = await ethers.getContractFactory("NFTCollection");
  const nftCollection = await NFTCollection.deploy();
  await nftCollection.waitForDeployment();
  console.log("NFTCollection deployed to:", nftCollection.target);

  // Sử dụng Chainlink ETH/USD Price Feed thật trên Sepolia
  const sepoliaETHUSDPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  console.log("Sử dụng Chainlink ETH/USD Price Feed:", sepoliaETHUSDPriceFeed);

  // Deploy Marketplace với Chainlink Price Feed address
  const Marketplace = await ethers.getContractFactory("MarketPlace");
  const marketplace = await Marketplace.deploy(sepoliaETHUSDPriceFeed);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", marketplace.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 