const fs = require("fs");
const path = require("path");

// Danh sách các contract cần export ABI
const CONTRACTS = [
  "MarketPlace",
  "NFTCollection", 
  "DynamicPricing",
  "AutomatedRewards",
  "RarityVerification",
  "RewardToken"
];

async function main() {
  const outputDir = path.join(__dirname, "..", "abis");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const contractName of CONTRACTS) {
    try {
      const artifactPath = path.join(
        __dirname,
        "..",
        "artifacts",
        "contracts",
        `${contractName}.sol`,
        `${contractName}.json`
      );

      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        const abi = artifact.abi;

        fs.writeFileSync(
          path.join(outputDir, `${contractName}.json`),
          JSON.stringify(abi, null, 2)
        );

        console.log(`✅ ABI exported to /abis/${contractName}.json`);
      } else {
        console.log(`⚠️ Artifact not found for ${contractName}`);
      }
    } catch (error) {
      console.error(`❌ Error exporting ABI for ${contractName}:`, error.message);
    }
  }

  console.log(`\n🎉 Export hoàn thành! Tổng cộng ${CONTRACTS.length} contracts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 