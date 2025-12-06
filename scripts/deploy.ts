/**
 * @title Privacy Health Monitor Deployment Script
 * @notice Deploys the PrivacyHealthMonitor contract to the specified network
 * @dev Usage: npx hardhat run scripts/deploy.ts --network <network-name>
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🏥 Deploying Privacy Health Monitor...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy PrivacyHealthMonitor
  console.log("Deploying PrivacyHealthMonitor contract...");
  const PrivacyHealthMonitor = await ethers.getContractFactory("PrivacyHealthMonitor");
  const monitor = await PrivacyHealthMonitor.deploy();
  await monitor.waitForDeployment();

  const contractAddress = await monitor.getAddress();
  console.log("✅ PrivacyHealthMonitor deployed to:", contractAddress);

  // Get contract information
  const owner = await monitor.owner();
  const currentPeriod = await monitor.currentPeriod();

  console.log("\n📋 Contract Information:");
  console.log("Owner:", owner);
  console.log("Current Period:", currentPeriod.toString());
  console.log("Owner is auto-authorized as doctor:", await monitor.authorizedDoctors(owner));

  // Network information
  const network = await ethers.provider.getNetwork();
  console.log("\n🌐 Network Information:");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());

  // Provide next steps
  console.log("\n📝 Next Steps:");
  console.log("1. Save the contract address:", contractAddress);
  console.log("2. Authorize patients: await monitor.authorizePatient(patientAddress)");
  console.log("3. Authorize doctors: await monitor.authorizeDoctor(doctorAddress)");
  console.log("4. Start reporting period: await monitor.startNewPeriod()");

  if (network.chainId === 11155111n) {
    console.log("\n🔍 Verify contract on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
  }

  // Save deployment info
  const deploymentInfo = {
    contract: "PrivacyHealthMonitor",
    address: contractAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    owner: owner,
    currentPeriod: currentPeriod.toString(),
  };

  console.log("\n💾 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
