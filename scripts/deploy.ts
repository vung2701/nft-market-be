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

  // Deploy Marketplace
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", marketplace.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });