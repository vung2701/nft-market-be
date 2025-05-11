import { ethers } from "hardhat";
import { expect } from "chai";

describe("Marketplace", function () {
  it("should list and buy NFT", async function () {
    const [deployer, seller, buyer] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTCollection");
    const nft = await NFT.connect(seller).deploy();
    await nft.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const market = await Marketplace.connect(deployer).deploy();
    await market.waitForDeployment();

    // Mint NFT to seller
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri-1");

    // Approve marketplace
    await nft.connect(seller).approve(await market.getAddress(), 0);

    // List NFT
    await market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseEther("1"));

    // Buy NFT
    await market.connect(buyer).buyNFT(0, { value: ethers.parseEther("1") });

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
  });
});
