import { ethers } from "hardhat";
import { expect } from "chai";

describe("NFTCollection", function () {
  it("Should mint an NFT and return correct data", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTCollection");
    const nft = await NFT.deploy();
    await nft.waitForDeployment();

    const tx = await nft.mintNFT(addr1.address, "ipfs://token-uri-1");
    await tx.wait();

    expect(await nft.ownerOf(0)).to.equal(addr1.address);
    expect(await nft.tokenCounter()).to.equal(1);
    expect(await nft.tokenURI(0)).to.equal("ipfs://token-uri-1");
  });
});
