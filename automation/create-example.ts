/**
 * @title FHEVM Example Generator
 * @notice Creates a standalone FHEVM example repository from a template
 * @dev This script clones the base template and customizes it for a specific example
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface ExampleConfig {
  name: string;
  description: string;
  category: string;
  contractName: string;
  features: string[];
}

const EXAMPLES: Record<string, ExampleConfig> = {
  "privacy-health-monitor": {
    name: "Privacy Health Monitor",
    description: "Privacy-preserving health monitoring with encrypted data aggregation",
    category: "healthcare",
    contractName: "PrivacyHealthMonitor",
    features: [
      "Encrypted health data submission",
      "Role-based access control",
      "Period-based aggregation",
      "Health alerts",
      "Emergency access patterns",
    ],
  },
  "encrypted-voting": {
    name: "Encrypted Voting",
    description: "Anonymous voting system with encrypted ballots",
    category: "governance",
    contractName: "EncryptedVoting",
    features: [
      "Anonymous voting",
      "Encrypted ballot counting",
      "Public result decryption",
      "Voter eligibility verification",
    ],
  },
  "confidential-auction": {
    name: "Confidential Auction",
    description: "Sealed-bid auction with private bids",
    category: "finance",
    contractName: "ConfidentialAuction",
    features: [
      "Sealed bid submission",
      "Private bid amounts",
      "Winner determination",
      "Bid decryption after close",
    ],
  },
};

/**
 * Create example directory structure
 */
function createDirectoryStructure(examplePath: string) {
  const dirs = ["contracts", "test", "scripts", "automation", "docs"];

  for (const dir of dirs) {
    const dirPath = path.join(examplePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Generate package.json for example
 */
function generatePackageJson(config: ExampleConfig, examplePath: string) {
  const packageJson = {
    name: `fhevm-${config.name.toLowerCase().replace(/\s+/g, "-")}`,
    version: "1.0.0",
    description: config.description,
    scripts: {
      compile: "hardhat compile",
      test: "hardhat test",
      "test:coverage": "hardhat coverage",
      "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
      "deploy:local": "hardhat run scripts/deploy.ts --network hardhat",
      node: "hardhat node",
      clean: "hardhat clean",
      "generate:docs": "ts-node automation/generate-docs.ts",
    },
    keywords: [
      "fhevm",
      "fhe",
      "zama",
      "privacy",
      config.category,
      "encryption",
      "blockchain",
    ],
    author: `${config.name} Team`,
    license: "MIT",
    devDependencies: {
      "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
      "@nomicfoundation/hardhat-ethers": "^3.0.0",
      "@nomicfoundation/hardhat-network-helpers": "^1.0.0",
      "@nomicfoundation/hardhat-toolbox": "^4.0.0",
      "@types/chai": "^4.3.0",
      "@types/mocha": "^10.0.0",
      "@types/node": "^20.0.0",
      chai: "^4.3.0",
      dotenv: "^16.3.0",
      ethers: "^6.9.0",
      hardhat: "^2.19.0",
      "ts-node": "^10.9.0",
      typescript: "^5.3.0",
    },
    dependencies: {
      "@fhevm/solidity": "^0.5.0",
    },
  };

  fs.writeFileSync(
    path.join(examplePath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
}

/**
 * Generate README for example
 */
function generateReadme(config: ExampleConfig, examplePath: string) {
  let readme = `# ${config.name}\n\n`;
  readme += `${config.description}\n\n`;
  readme += `## Features\n\n`;

  for (const feature of config.features) {
    readme += `- ✅ ${feature}\n`;
  }

  readme += `\n## FHEVM Concepts\n\n`;
  readme += `This example demonstrates:\n\n`;
  readme += `- Encryption with FHE.asEuint()\n`;
  readme += `- Access control with FHE.allow()\n`;
  readme += `- Public decryption with FHE.requestDecryption()\n\n`;

  readme += `## Installation\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `npm install\n`;
  readme += `\`\`\`\n\n`;

  readme += `## Testing\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `npm test\n`;
  readme += `\`\`\`\n\n`;

  readme += `## Deployment\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `npm run deploy:sepolia\n`;
  readme += `\`\`\`\n\n`;

  readme += `## License\n\n`;
  readme += `MIT\n`;

  fs.writeFileSync(path.join(examplePath, "README.md"), readme);
}

/**
 * Copy hardhat config
 */
function copyHardhatConfig(examplePath: string) {
  const configContent = `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
`;

  fs.writeFileSync(path.join(examplePath, "hardhat.config.ts"), configContent);
}

/**
 * Copy TypeScript config
 */
function copyTsConfig(examplePath: string) {
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "commonjs",
      lib: ["ES2020"],
      outDir: "./dist",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      moduleResolution: "node",
      types: ["node", "mocha", "chai"],
    },
    include: ["./scripts/**/*", "./test/**/*", "./automation/**/*", "hardhat.config.ts"],
    exclude: ["node_modules", "dist", "cache", "artifacts"],
  };

  fs.writeFileSync(
    path.join(examplePath, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2)
  );
}

/**
 * Generate .gitignore
 */
function generateGitignore(examplePath: string) {
  const gitignore = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Hardhat
cache/
artifacts/
typechain-types/

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage
coverage/
coverage.json
.coverage_cache/

# Misc
.cache/
temp/
tmp/
`;

  fs.writeFileSync(path.join(examplePath, ".gitignore"), gitignore);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const exampleKey = args[0];

  if (!exampleKey) {
    console.log("📚 Available examples:");
    for (const [key, config] of Object.entries(EXAMPLES)) {
      console.log(`  - ${key}: ${config.description}`);
    }
    console.log("\nUsage: npm run create:example <example-key>");
    return;
  }

  const config = EXAMPLES[exampleKey];
  if (!config) {
    console.error(`❌ Unknown example: ${exampleKey}`);
    console.log("Available examples:", Object.keys(EXAMPLES).join(", "));
    process.exit(1);
  }

  const examplePath = path.join(process.cwd(), "..", exampleKey);

  console.log(`🏗️  Creating FHEVM example: ${config.name}\n`);

  // Create directory structure
  console.log("📁 Creating directory structure...");
  createDirectoryStructure(examplePath);

  // Generate files
  console.log("📝 Generating package.json...");
  generatePackageJson(config, examplePath);

  console.log("📝 Generating README...");
  generateReadme(config, examplePath);

  console.log("📝 Copying configuration files...");
  copyHardhatConfig(examplePath);
  copyTsConfig(examplePath);
  generateGitignore(examplePath);

  console.log("\n✅ Example created successfully!");
  console.log(`\nNext steps:`);
  console.log(`  cd ${exampleKey}`);
  console.log(`  npm install`);
  console.log(`  # Add your contract to contracts/`);
  console.log(`  # Add tests to test/`);
  console.log(`  npm test`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Example creation failed:", error);
    process.exit(1);
  });
