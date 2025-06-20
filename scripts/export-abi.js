const fs = require("fs");
const path = require("path");

const CONTRACT_NAME = "MarketPlace"; // Replace with your contract name

async function main() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${CONTRACT_NAME}.sol`,
    `${CONTRACT_NAME}.json`
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const abi = artifact.abi;

  const outputDir = path.join(__dirname, "..", "abis");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, `${CONTRACT_NAME}.json`),
    JSON.stringify(abi, null, 2)
  );

  console.log(`✅ ABI exported to /abis/${CONTRACT_NAME}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 