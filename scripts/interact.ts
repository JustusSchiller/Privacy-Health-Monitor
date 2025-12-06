/**
 * @title Privacy Health Monitor Interaction Script
 * @notice Example script for interacting with deployed contract
 * @dev Demonstrates common operations like authorization and data submission
 */

import { ethers } from "hardhat";

// Update this with your deployed contract address
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE";

async function main() {
  console.log("🏥 Interacting with Privacy Health Monitor...\n");

  const [owner, patient, doctor] = await ethers.getSigners();
  console.log("Using accounts:");
  console.log("Owner:", owner.address);
  console.log("Patient:", patient.address);
  console.log("Doctor:", doctor.address, "\n");

  // Connect to deployed contract
  const monitor = await ethers.getContractAt("PrivacyHealthMonitor", CONTRACT_ADDRESS);
  console.log("Connected to contract at:", CONTRACT_ADDRESS, "\n");

  // Example 1: Authorize patient
  console.log("📝 Authorizing patient...");
  const authPatientTx = await monitor.authorizePatient(patient.address);
  await authPatientTx.wait();
  console.log("✅ Patient authorized\n");

  // Example 2: Authorize doctor
  console.log("📝 Authorizing doctor...");
  const authDoctorTx = await monitor.authorizeDoctor(doctor.address);
  await authDoctorTx.wait();
  console.log("✅ Doctor authorized\n");

  // Example 3: Start reporting period
  console.log("📝 Starting new reporting period...");
  const startPeriodTx = await monitor.startNewPeriod();
  await startPeriodTx.wait();
  console.log("✅ New period started\n");

  // Example 4: Get current period info
  const [period, startTime, endTime, active, reportCount] =
    await monitor.getCurrentPeriodInfo();
  console.log("📊 Current Period Info:");
  console.log("Period:", period.toString());
  console.log("Active:", active);
  console.log("Report Count:", reportCount.toString());
  console.log("Time remaining:", await monitor.getTimeRemainingInPeriod(), "seconds\n");

  // Example 5: Submit health data
  console.log("📝 Submitting health data as patient...");
  const submitTx = await monitor.connect(patient).submitHealthData(
    75,  // heart rate
    120, // systolic BP
    80,  // diastolic BP
    90,  // glucose
    98   // temperature
  );
  await submitTx.wait();
  console.log("✅ Health data submitted\n");

  // Example 6: Check patient report status
  const [hasReported, timestamp] = await monitor.getPatientReportStatus(patient.address);
  console.log("📊 Patient Report Status:");
  console.log("Has Reported:", hasReported);
  console.log("Timestamp:", new Date(Number(timestamp) * 1000).toLocaleString(), "\n");

  console.log("✅ Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
