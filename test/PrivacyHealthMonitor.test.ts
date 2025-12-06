/**
 * @title Privacy Health Monitor Test Suite
 * @notice Comprehensive tests demonstrating FHEVM encrypted health monitoring
 * @dev This test suite showcases:
 *      - Encrypted health data submission using FHE
 *      - Access control patterns for patients and doctors
 *      - Period-based data aggregation
 *      - Public and user decryption workflows
 *      - Emergency access patterns
 *
 * @chapter access-control
 * @chapter encryption
 * @chapter public-decryption
 * @chapter aggregation
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyHealthMonitor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Privacy Health Monitor - FHEVM Example", function () {
  let monitor: PrivacyHealthMonitor;
  let owner: SignerWithAddress;
  let doctor: SignerWithAddress;
  let patient1: SignerWithAddress;
  let patient2: SignerWithAddress;
  let patient3: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  // Test data constants
  const HEALTHY_VITALS = {
    heartRate: 75,
    systolic: 120,
    diastolic: 80,
    glucose: 90,
    temperature: 98,
  };

  const ALERT_VITALS = {
    heartRate: 130, // High heart rate
    systolic: 150,  // High blood pressure
    diastolic: 95,
    glucose: 150,   // High glucose
    temperature: 99,
  };

  const REPORTING_PERIOD = 86400; // 24 hours in seconds

  /**
   * @notice Deploy contract and setup test accounts before each test
   * @dev Demonstrates:
   *      - Contract deployment
   *      - Initial owner setup (owner is automatically authorized as doctor)
   */
  beforeEach(async function () {
    [owner, doctor, patient1, patient2, patient3, unauthorized] = await ethers.getSigners();

    const PrivacyHealthMonitorFactory = await ethers.getContractFactory("PrivacyHealthMonitor");
    monitor = await PrivacyHealthMonitorFactory.deploy();
    await monitor.waitForDeployment();
  });

  describe("Deployment and Initialization", function () {
    /**
     * @notice Test contract initialization
     * @dev Verifies:
     *      - Owner is set correctly
     *      - Initial period is 1
     *      - Owner is auto-authorized as doctor
     */
    it("Should set the correct owner and initial state", async function () {
      expect(await monitor.owner()).to.equal(owner.address);
      expect(await monitor.currentPeriod()).to.equal(1);
      expect(await monitor.authorizedDoctors(owner.address)).to.be.true;
    });

    /**
     * @notice Test initial authorization state
     * @dev Shows that new accounts need explicit authorization
     */
    it("Should not authorize patients or doctors by default", async function () {
      expect(await monitor.authorizedPatients(patient1.address)).to.be.false;
      expect(await monitor.authorizedDoctors(doctor.address)).to.be.false;
    });
  });

  describe("Access Control Patterns", function () {
    /**
     * @notice Demonstrate proper access control using FHE.allow()
     * @dev Key concepts:
     *      - Only owner can authorize users
     *      - PatientAuthorized event is emitted
     *      - Authorization is persistent
     *
     * @chapter access-control
     */
    it("Should allow owner to authorize patients", async function () {
      await expect(monitor.authorizePatient(patient1.address))
        .to.emit(monitor, "PatientAuthorized")
        .withArgs(patient1.address);

      expect(await monitor.authorizedPatients(patient1.address)).to.be.true;
    });

    /**
     * @notice Demonstrate doctor authorization
     * @dev Similar to patient authorization but for doctor role
     */
    it("Should allow owner to authorize doctors", async function () {
      await expect(monitor.authorizeDoctor(doctor.address))
        .to.emit(monitor, "DoctorAuthorized")
        .withArgs(doctor.address);

      expect(await monitor.authorizedDoctors(doctor.address)).to.be.true;
    });

    /**
     * @notice Common pitfall: Non-owner trying to authorize users
     * @dev Anti-pattern: Only owner can manage authorizations
     */
    it("Should prevent non-owner from authorizing users", async function () {
      await expect(
        monitor.connect(unauthorized).authorizePatient(patient1.address)
      ).to.be.revertedWith("Not authorized");

      await expect(
        monitor.connect(unauthorized).authorizeDoctor(doctor.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Period Management", function () {
    /**
     * @notice Demonstrate reporting period lifecycle
     * @dev Shows:
     *      - Starting a new period
     *      - Period state tracking
     *      - Time-based period activation
     *
     * @chapter period-management
     */
    it("Should start a new reporting period", async function () {
      await expect(monitor.startNewPeriod())
        .to.emit(monitor, "PeriodStarted")
        .withArgs(1, await time.latest());

      const [period, startTime, endTime, active, reportCount] =
        await monitor.getCurrentPeriodInfo();

      expect(period).to.equal(1);
      expect(active).to.be.true;
      expect(reportCount).to.equal(0);
      expect(endTime - startTime).to.equal(REPORTING_PERIOD);
    });

    /**
     * @notice Test period status checking
     * @dev isReportingPeriodActive() is used to prevent submissions outside period
     */
    it("Should correctly report period active status", async function () {
      expect(await monitor.isReportingPeriodActive()).to.be.false;

      await monitor.startNewPeriod();
      expect(await monitor.isReportingPeriodActive()).to.be.true;

      // Fast forward past the period
      await time.increase(REPORTING_PERIOD + 1);
      expect(await monitor.isReportingPeriodActive()).to.be.false;
    });

    /**
     * @notice Common pitfall: Starting overlapping periods
     * @dev Anti-pattern: Cannot start new period while one is active
     */
    it("Should prevent starting overlapping periods", async function () {
      await monitor.startNewPeriod();

      await expect(monitor.startNewPeriod()).to.be.revertedWith(
        "Period already active"
      );
    });

    /**
     * @notice Test time remaining calculation
     * @dev Useful for frontend displays
     */
    it("Should correctly calculate time remaining", async function () {
      await monitor.startNewPeriod();

      const timeRemaining = await monitor.getTimeRemainingInPeriod();
      expect(timeRemaining).to.be.closeTo(REPORTING_PERIOD, 5);

      await time.increase(3600); // 1 hour
      const timeRemaining2 = await monitor.getTimeRemainingInPeriod();
      expect(timeRemaining2).to.be.closeTo(REPORTING_PERIOD - 3600, 5);
    });
  });

  describe("Encrypted Health Data Submission", function () {
    beforeEach(async function () {
      await monitor.authorizePatient(patient1.address);
      await monitor.startNewPeriod();
    });

    /**
     * @notice Demonstrate encrypted health data submission
     * @dev Key FHE concepts demonstrated:
     *      1. Data is encrypted using FHE.asEuint8()
     *      2. FHE.allowThis() grants contract access to encrypted values
     *      3. FHE.allow(value, user) grants user access to their data
     *      4. Original user can still access their encrypted data
     *
     * @chapter encryption
     * @chapter access-control
     */
    it("Should allow authorized patient to submit encrypted health data", async function () {
      const tx = await monitor.connect(patient1).submitHealthData(
        HEALTHY_VITALS.heartRate,
        HEALTHY_VITALS.systolic,
        HEALTHY_VITALS.diastolic,
        HEALTHY_VITALS.glucose,
        HEALTHY_VITALS.temperature
      );

      await expect(tx)
        .to.emit(monitor, "HealthDataSubmitted")
        .withArgs(patient1.address, 1);

      const [hasReported, timestamp] = await monitor.getPatientReportStatus(patient1.address);
      expect(hasReported).to.be.true;
      expect(timestamp).to.be.gt(0);
    });

    /**
     * @notice Test multiple patient submissions
     * @dev Shows that multiple patients can submit data in same period
     */
    it("Should allow multiple patients to submit data", async function () {
      await monitor.authorizePatient(patient2.address);
      await monitor.authorizePatient(patient3.address);

      await monitor.connect(patient1).submitHealthData(
        HEALTHY_VITALS.heartRate,
        HEALTHY_VITALS.systolic,
        HEALTHY_VITALS.diastolic,
        HEALTHY_VITALS.glucose,
        HEALTHY_VITALS.temperature
      );

      await monitor.connect(patient2).submitHealthData(
        80, 125, 82, 95, 98
      );

      await monitor.connect(patient3).submitHealthData(
        70, 118, 78, 88, 98
      );

      const [, , , , reportCount] = await monitor.getCurrentPeriodInfo();
      expect(reportCount).to.equal(3);
    });

    /**
     * @notice Common pitfall: Duplicate submissions
     * @dev Anti-pattern: Each patient can only submit once per period
     */
    it("Should prevent duplicate submissions in same period", async function () {
      await monitor.connect(patient1).submitHealthData(
        HEALTHY_VITALS.heartRate,
        HEALTHY_VITALS.systolic,
        HEALTHY_VITALS.diastolic,
        HEALTHY_VITALS.glucose,
        HEALTHY_VITALS.temperature
      );

      await expect(
        monitor.connect(patient1).submitHealthData(
          HEALTHY_VITALS.heartRate,
          HEALTHY_VITALS.systolic,
          HEALTHY_VITALS.diastolic,
          HEALTHY_VITALS.glucose,
          HEALTHY_VITALS.temperature
        )
      ).to.be.revertedWith("Already reported this period");
    });

    /**
     * @notice Common pitfall: Unauthorized patient submission
     * @dev Anti-pattern: Must be authorized before submitting data
     */
    it("Should prevent unauthorized patient from submitting data", async function () {
      await expect(
        monitor.connect(unauthorized).submitHealthData(
          HEALTHY_VITALS.heartRate,
          HEALTHY_VITALS.systolic,
          HEALTHY_VITALS.diastolic,
          HEALTHY_VITALS.glucose,
          HEALTHY_VITALS.temperature
        )
      ).to.be.revertedWith("Not authorized patient");
    });

    /**
     * @notice Common pitfall: Submission outside active period
     * @dev Anti-pattern: Can only submit during active reporting period
     */
    it("Should prevent submission outside active period", async function () {
      // Fast forward past the period
      await time.increase(REPORTING_PERIOD + 1);

      await expect(
        monitor.connect(patient1).submitHealthData(
          HEALTHY_VITALS.heartRate,
          HEALTHY_VITALS.systolic,
          HEALTHY_VITALS.diastolic,
          HEALTHY_VITALS.glucose,
          HEALTHY_VITALS.temperature
        )
      ).to.be.revertedWith("Not reporting period");
    });
  });

  describe("Health Alert System", function () {
    beforeEach(async function () {
      await monitor.authorizePatient(patient1.address);
      await monitor.startNewPeriod();
    });

    /**
     * @notice Demonstrate automatic health alerts
     * @dev Alert thresholds:
     *      - Heart rate: < 50 or > 120 BPM
     *      - Systolic BP: > 140 mmHg
     *      - Glucose: < 60 or > 140 mg/dL
     *
     * @chapter monitoring
     */
    it("Should trigger health alerts for abnormal values", async function () {
      const tx = await monitor.connect(patient1).submitHealthData(
        ALERT_VITALS.heartRate,
        ALERT_VITALS.systolic,
        ALERT_VITALS.diastolic,
        ALERT_VITALS.glucose,
        ALERT_VITALS.temperature
      );

      // Should trigger multiple alerts
      await expect(tx)
        .to.emit(monitor, "AlertTriggered")
        .withArgs(patient1.address, 1, "Heart Rate Alert");

      await expect(tx)
        .to.emit(monitor, "AlertTriggered")
        .withArgs(patient1.address, 1, "High Blood Pressure Alert");

      await expect(tx)
        .to.emit(monitor, "AlertTriggered")
        .withArgs(patient1.address, 1, "Blood Glucose Alert");
    });

    /**
     * @notice Test no alerts for healthy values
     * @dev Shows conditional alert triggering
     */
    it("Should not trigger alerts for normal values", async function () {
      const tx = await monitor.connect(patient1).submitHealthData(
        HEALTHY_VITALS.heartRate,
        HEALTHY_VITALS.systolic,
        HEALTHY_VITALS.diastolic,
        HEALTHY_VITALS.glucose,
        HEALTHY_VITALS.temperature
      );

      // Get transaction receipt to check events
      const receipt = await tx.wait();
      const alertEvents = receipt?.logs.filter((log: any) => {
        try {
          const parsed = monitor.interface.parseLog(log);
          return parsed?.name === "AlertTriggered";
        } catch {
          return false;
        }
      });

      expect(alertEvents?.length).to.equal(0);
    });
  });

  describe("Period Summary and Aggregation", function () {
    beforeEach(async function () {
      await monitor.authorizeDoctor(doctor.address);
      await monitor.authorizePatient(patient1.address);
      await monitor.authorizePatient(patient2.address);
      await monitor.authorizePatient(patient3.address);
      await monitor.startNewPeriod();
    });

    /**
     * @notice Demonstrate period summary generation with public decryption
     * @dev Key FHE concepts:
     *      1. FHE.requestDecryption() initiates async decryption
     *      2. Decrypted values are processed in callback
     *      3. Results are re-encrypted for storage
     *      4. Only authorized doctors can generate summaries
     *
     * @chapter public-decryption
     * @chapter aggregation
     */
    it("Should generate period summary after submissions", async function () {
      // Multiple patients submit data
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await monitor.connect(patient2).submitHealthData(80, 125, 82, 95, 99);
      await monitor.connect(patient3).submitHealthData(70, 118, 78, 88, 97);

      // Fast forward past period
      await time.increase(REPORTING_PERIOD + 1);

      // Only doctors can generate summary
      await expect(
        monitor.connect(doctor).generatePeriodSummary()
      ).to.emit(monitor, "SummaryGenerated");
    });

    /**
     * @notice Common pitfall: Generating summary too early
     * @dev Anti-pattern: Must wait for period to end
     */
    it("Should prevent summary generation before period ends", async function () {
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);

      await expect(
        monitor.connect(doctor).generatePeriodSummary()
      ).to.be.revertedWith("Period not ended");
    });

    /**
     * @notice Common pitfall: Unauthorized summary generation
     * @dev Anti-pattern: Only authorized doctors can generate summaries
     */
    it("Should prevent unauthorized users from generating summary", async function () {
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await time.increase(REPORTING_PERIOD + 1);

      await expect(
        monitor.connect(unauthorized).generatePeriodSummary()
      ).to.be.revertedWith("Not authorized doctor");
    });

    /**
     * @notice Test duplicate summary prevention
     * @dev Shows that summary can only be generated once per period
     */
    it("Should prevent duplicate summary generation", async function () {
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await time.increase(REPORTING_PERIOD + 1);

      await monitor.connect(doctor).generatePeriodSummary();

      await expect(
        monitor.connect(doctor).generatePeriodSummary()
      ).to.be.revertedWith("Summary already generated");
    });
  });

  describe("Emergency Access Pattern", function () {
    beforeEach(async function () {
      await monitor.authorizeDoctor(doctor.address);
      await monitor.authorizePatient(patient1.address);
      await monitor.startNewPeriod();

      // Patient submits data
      await monitor.connect(patient1).submitHealthData(
        ALERT_VITALS.heartRate,
        ALERT_VITALS.systolic,
        ALERT_VITALS.diastolic,
        ALERT_VITALS.glucose,
        ALERT_VITALS.temperature
      );
    });

    /**
     * @notice Demonstrate emergency access pattern
     * @dev Shows:
     *      - Doctor can request emergency access to patient data
     *      - Uses FHE.allow() to grant temporary access
     *      - Useful for critical health situations
     *
     * @chapter access-control
     * @chapter emergency-patterns
     */
    it("Should allow doctor to request emergency access", async function () {
      await expect(
        monitor.connect(doctor).requestEmergencyAccess(patient1.address, 1)
      ).to.not.be.reverted;
    });

    /**
     * @notice Common pitfall: Unauthorized emergency access
     * @dev Anti-pattern: Only authorized doctors can request emergency access
     */
    it("Should prevent unauthorized emergency access requests", async function () {
      await expect(
        monitor.connect(unauthorized).requestEmergencyAccess(patient1.address, 1)
      ).to.be.revertedWith("Not authorized doctor");
    });

    /**
     * @notice Common pitfall: Emergency access for non-existent data
     * @dev Anti-pattern: Patient must have submitted data in that period
     */
    it("Should prevent emergency access for non-existent data", async function () {
      await expect(
        monitor.connect(doctor).requestEmergencyAccess(patient2.address, 1)
      ).to.be.revertedWith("No data for this patient");
    });
  });

  describe("Period History and Queries", function () {
    beforeEach(async function () {
      await monitor.authorizeDoctor(doctor.address);
      await monitor.authorizePatient(patient1.address);
    });

    /**
     * @notice Test period history access
     * @dev Shows that doctors can view historical period data
     */
    it("Should allow doctors to view period history", async function () {
      await monitor.startNewPeriod();
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await time.increase(REPORTING_PERIOD + 1);
      await monitor.connect(doctor).generatePeriodSummary();

      const [startTime, endTime, summaryGenerated, reportCount] =
        await monitor.connect(doctor).getPeriodHistory(1);

      expect(summaryGenerated).to.be.true;
      expect(reportCount).to.equal(1);
      expect(endTime - startTime).to.equal(REPORTING_PERIOD);
    });

    /**
     * @notice Common pitfall: Unauthorized period history access
     * @dev Anti-pattern: Only authorized doctors can view period history
     */
    it("Should prevent non-doctors from viewing period history", async function () {
      await monitor.startNewPeriod();

      await expect(
        monitor.connect(unauthorized).getPeriodHistory(1)
      ).to.be.revertedWith("Not authorized doctor");
    });

    /**
     * @notice Test patient report status checking
     * @dev Public view function for checking if patient has reported
     */
    it("Should allow checking patient report status", async function () {
      await monitor.startNewPeriod();

      let [hasReported, timestamp] = await monitor.getPatientReportStatus(patient1.address);
      expect(hasReported).to.be.false;

      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);

      [hasReported, timestamp] = await monitor.getPatientReportStatus(patient1.address);
      expect(hasReported).to.be.true;
      expect(timestamp).to.be.gt(0);
    });
  });

  describe("Multi-Period Workflow", function () {
    /**
     * @notice Demonstrate complete multi-period workflow
     * @dev Shows:
     *      - Complete period lifecycle
     *      - Period transitions
     *      - Data isolation between periods
     *
     * @chapter workflow
     */
    it("Should support multiple consecutive periods", async function () {
      await monitor.authorizePatient(patient1.address);
      await monitor.authorizeDoctor(doctor.address);

      // Period 1
      await monitor.startNewPeriod();
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await time.increase(REPORTING_PERIOD + 1);
      await monitor.connect(doctor).generatePeriodSummary();

      // Period 2 should auto-increment
      expect(await monitor.currentPeriod()).to.equal(2);

      // Start period 2
      await monitor.startNewPeriod();
      const [period] = await monitor.getCurrentPeriodInfo();
      expect(period).to.equal(2);

      // Patient can report again in new period
      await monitor.connect(patient1).submitHealthData(80, 122, 81, 92, 98);
      const [hasReported] = await monitor.getPatientReportStatus(patient1.address);
      expect(hasReported).to.be.true;
    });

    /**
     * @notice Test data isolation between periods
     * @dev Shows that each period maintains separate data
     */
    it("Should maintain data isolation between periods", async function () {
      await monitor.authorizePatient(patient1.address);
      await monitor.authorizeDoctor(doctor.address);

      // Period 1
      await monitor.startNewPeriod();
      await monitor.connect(patient1).submitHealthData(75, 120, 80, 90, 98);
      await time.increase(REPORTING_PERIOD + 1);
      await monitor.connect(doctor).generatePeriodSummary();

      // Check period 1 history
      const [, , summaryGenerated1, reportCount1] =
        await monitor.connect(doctor).getPeriodHistory(1);
      expect(summaryGenerated1).to.be.true;
      expect(reportCount1).to.equal(1);

      // Period 2
      await monitor.startNewPeriod();
      const [hasReported] = await monitor.getPatientReportStatus(patient1.address);
      expect(hasReported).to.be.false; // Reset for new period
    });
  });

  describe("Edge Cases and Gas Optimization", function () {
    /**
     * @notice Test empty period summary
     * @dev Shows that summary can be generated even with no submissions
     */
    it("Should handle period with no submissions", async function () {
      await monitor.authorizeDoctor(doctor.address);
      await monitor.startNewPeriod();
      await time.increase(REPORTING_PERIOD + 1);

      await expect(
        monitor.connect(doctor).generatePeriodSummary()
      ).to.emit(monitor, "SummaryGenerated")
        .withArgs(1, 0);
    });

    /**
     * @notice Test gas usage for single submission
     * @dev Useful for estimating transaction costs
     */
    it("Should estimate gas for health data submission", async function () {
      await monitor.authorizePatient(patient1.address);
      await monitor.startNewPeriod();

      const tx = await monitor.connect(patient1).submitHealthData(
        HEALTHY_VITALS.heartRate,
        HEALTHY_VITALS.systolic,
        HEALTHY_VITALS.diastolic,
        HEALTHY_VITALS.glucose,
        HEALTHY_VITALS.temperature
      );

      const receipt = await tx.wait();
      console.log(`Gas used for health data submission: ${receipt?.gasUsed}`);

      // Gas should be reasonable (adjust threshold as needed)
      expect(receipt?.gasUsed).to.be.lt(500000);
    });
  });
});
