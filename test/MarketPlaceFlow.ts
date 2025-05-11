import { ethers } from "hardhat";
import { expect } from "chai";

describe("Full Flow Marketplace test", function () {
  let nft: any;
  let market: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [ seller, buyer] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTCollection");
    nft = await NFT.connect(seller).deploy();
    await nft.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    market = await Marketplace.connect(seller).deploy();
    await market.waitForDeployment();
  });
  
  it("should mint, approve, list, and buy NFT", async () => {
    // Mint NFT
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");

    // Approve
    await nft.connect(seller).approve(await market.getAddress(), 0);

    // List NFT
    await market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseEther("1"));

    // Buyer buys
    await market.connect(buyer).buyNFT(0, { value: ethers.parseEther("1") });

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
  });

  it("should fail to list without approval", async () => {
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");
  
    await expect(
      market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseEther("1"))
    ).to.be.revertedWith("Marketplace not approved");
  });

  it("should fail to list without approval", async () => {
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");
  
    await expect(
      market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseEther("1"))
    ).to.be.revertedWith("Marketplace not approved");
  });
});
