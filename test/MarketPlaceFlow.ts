import { ethers } from "hardhat";
import { expect } from "chai";

describe("Full Flow Marketplace test", function () {
  let nft: any;
  let market: any;
  let seller: any;
  let buyer: any;

  beforeEach(async function () {
    [seller, buyer] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTCollection");
    nft = await NFT.connect(seller).deploy();
    await nft.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("MarketPlace");
    market = await Marketplace.connect(seller).deploy();
    await market.waitForDeployment();
  });

  it("should mint, approve, list, and buy NFT", async () => {
    // Mint NFT
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");

    // Approve
    await nft.connect(seller).approve(await market.getAddress(), 0);

    // List NFT with price in USD (100 USD)
    await market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseUnits("100", 8));

    // Get current ETH price
    const ethPrice = await market.getLatestPrice();
    const requiredEth = await market.convertUsdToEth(ethers.parseUnits("100", 8));

    // Buyer buys
    await market.connect(buyer).buyNFT(0, { value: requiredEth });

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
  });

  it("should fail to list without approval", async () => {
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");

    await expect(
      market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseUnits("100", 8))
    ).to.be.revertedWith("Marketplace not approved");
  });

  it("should fail to buy with insufficient ETH", async () => {
    await nft.connect(seller).mintNFT(seller.address, "ipfs://uri");
    await nft.connect(seller).approve(await market.getAddress(), 0);
    await market.connect(seller).listNFT(await nft.getAddress(), 0, ethers.parseUnits("100", 8));

    const requiredEth = await market.convertUsdToEth(ethers.parseUnits("100", 8));
    const insufficientEth = requiredEth.div(2); // Send half the required amount

    await expect(
      market.connect(buyer).buyNFT(0, { value: insufficientEth })
    ).to.be.revertedWith("Insufficient ETH sent");
  });
});
