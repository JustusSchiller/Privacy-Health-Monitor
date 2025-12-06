// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivacyHealthMonitor is SepoliaConfig {

    address public owner;
    uint32 public currentPeriod;
    uint256 public lastReportTime;

    // 24 hours period (86400 seconds)
    uint256 constant REPORTING_PERIOD = 86400;

    struct HealthData {
        euint8 heartRate;
        euint8 bloodPressureSystolic;
        euint8 bloodPressureDiastolic;
        euint8 bloodGlucose;
        euint8 temperature;
        bool hasReported;
        uint256 timestamp;
    }

    struct Period {
        uint256 startTime;
        uint256 endTime;
        bool periodActive;
        bool summaryGenerated;
        address[] reporters;
        euint16 totalReports;
        euint8 averageHeartRate;
        euint8 averageBloodPressure;
        euint8 averageGlucose;
    }

    mapping(uint32 => Period) public periods;
    mapping(uint32 => mapping(address => HealthData)) public healthReports;
    mapping(address => bool) public authorizedPatients;
    mapping(address => bool) public authorizedDoctors;

    event PeriodStarted(uint32 indexed period, uint256 startTime);
    event HealthDataSubmitted(address indexed patient, uint32 indexed period);
    event SummaryGenerated(uint32 indexed period, uint256 totalReports);
    event PatientAuthorized(address indexed patient);
    event DoctorAuthorized(address indexed doctor);
    event AlertTriggered(address indexed patient, uint32 indexed period, string alertType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyAuthorizedPatient() {
        require(authorizedPatients[msg.sender], "Not authorized patient");
        _;
    }

    modifier onlyAuthorizedDoctor() {
        require(authorizedDoctors[msg.sender], "Not authorized doctor");
        _;
    }

    modifier onlyDuringReportingPeriod() {
        require(isReportingPeriodActive(), "Not reporting period");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentPeriod = 1;
        lastReportTime = block.timestamp;
        authorizedDoctors[msg.sender] = true;
    }

    // Check if current period is active for reporting
    function isReportingPeriodActive() public view returns (bool) {
        if (!periods[currentPeriod].periodActive) return false;
        return block.timestamp < periods[currentPeriod].endTime;
    }

    // Authorize a patient to submit health data
    function authorizePatient(address patient) external onlyOwner {
        authorizedPatients[patient] = true;
        emit PatientAuthorized(patient);
    }

    // Authorize a doctor to access aggregated data
    function authorizeDoctor(address doctor) external onlyOwner {
        authorizedDoctors[doctor] = true;
        emit DoctorAuthorized(doctor);
    }

    // Start new reporting period
    function startNewPeriod() external onlyOwner {
        require(!periods[currentPeriod].periodActive ||
                block.timestamp >= periods[currentPeriod].endTime,
                "Period already active");

        periods[currentPeriod] = Period({
            startTime: block.timestamp,
            endTime: block.timestamp + REPORTING_PERIOD,
            periodActive: true,
            summaryGenerated: false,
            reporters: new address[](0),
            totalReports: FHE.asEuint16(0),
            averageHeartRate: FHE.asEuint8(0),
            averageBloodPressure: FHE.asEuint8(0),
            averageGlucose: FHE.asEuint8(0)
        });

        // Grant access permissions
        FHE.allowThis(periods[currentPeriod].totalReports);
        FHE.allowThis(periods[currentPeriod].averageHeartRate);
        FHE.allowThis(periods[currentPeriod].averageBloodPressure);
        FHE.allowThis(periods[currentPeriod].averageGlucose);

        emit PeriodStarted(currentPeriod, block.timestamp);
    }

    // Submit encrypted health data
    function submitHealthData(
        uint8 _heartRate,
        uint8 _systolic,
        uint8 _diastolic,
        uint8 _glucose,
        uint8 _temperature
    ) external onlyAuthorizedPatient onlyDuringReportingPeriod {
        require(!healthReports[currentPeriod][msg.sender].hasReported,
                "Already reported this period");

        // Encrypt health data
        euint8 encryptedHeartRate = FHE.asEuint8(_heartRate);
        euint8 encryptedSystolic = FHE.asEuint8(_systolic);
        euint8 encryptedDiastolic = FHE.asEuint8(_diastolic);
        euint8 encryptedGlucose = FHE.asEuint8(_glucose);
        euint8 encryptedTemperature = FHE.asEuint8(_temperature);

        healthReports[currentPeriod][msg.sender] = HealthData({
            heartRate: encryptedHeartRate,
            bloodPressureSystolic: encryptedSystolic,
            bloodPressureDiastolic: encryptedDiastolic,
            bloodGlucose: encryptedGlucose,
            temperature: encryptedTemperature,
            hasReported: true,
            timestamp: block.timestamp
        });

        periods[currentPeriod].reporters.push(msg.sender);

        // Grant access permissions
        FHE.allowThis(encryptedHeartRate);
        FHE.allowThis(encryptedSystolic);
        FHE.allowThis(encryptedDiastolic);
        FHE.allowThis(encryptedGlucose);
        FHE.allowThis(encryptedTemperature);
        FHE.allow(encryptedHeartRate, msg.sender);
        FHE.allow(encryptedSystolic, msg.sender);
        FHE.allow(encryptedDiastolic, msg.sender);
        FHE.allow(encryptedGlucose, msg.sender);
        FHE.allow(encryptedTemperature, msg.sender);

        // Check for potential health alerts
        _checkHealthAlerts(msg.sender, _heartRate, _systolic, _glucose);

        emit HealthDataSubmitted(msg.sender, currentPeriod);
    }

    // Generate period summary with encrypted aggregated data
    function generatePeriodSummary() external onlyAuthorizedDoctor {
        require(periods[currentPeriod].periodActive, "No active period");
        require(block.timestamp >= periods[currentPeriod].endTime, "Period not ended");
        require(!periods[currentPeriod].summaryGenerated, "Summary already generated");

        Period storage period = periods[currentPeriod];
        uint256 reportCount = period.reporters.length;

        if (reportCount > 0) {
            // Request decryption for summary calculation
            bytes32[] memory cts = new bytes32[](reportCount * 4);
            uint256 index = 0;

            for (uint i = 0; i < reportCount; i++) {
                address reporter = period.reporters[i];
                HealthData storage data = healthReports[currentPeriod][reporter];

                cts[index++] = FHE.toBytes32(data.heartRate);
                cts[index++] = FHE.toBytes32(data.bloodPressureSystolic);
                cts[index++] = FHE.toBytes32(data.bloodGlucose);
                cts[index++] = FHE.toBytes32(data.temperature);
            }

            FHE.requestDecryption(cts, this.processSummary.selector);
        }

        period.summaryGenerated = true;
        period.periodActive = false;
    }

    // Process decrypted summary data
    function processSummary(
        uint256 requestId,
        uint8[] memory decryptedValues,
        bytes[] memory signatures
    ) external {
        // Verify signatures
        bytes memory decryptedBytes = abi.encode(decryptedValues);
        bytes memory signaturesBytes = abi.encode(signatures);
        FHE.checkSignatures(requestId, decryptedBytes, signaturesBytes);

        Period storage period = periods[currentPeriod];
        uint256 reportCount = period.reporters.length;

        if (reportCount > 0 && decryptedValues.length >= reportCount * 4) {
            uint256 totalHeartRate = 0;
            uint256 totalSystolic = 0;
            uint256 totalGlucose = 0;

            for (uint i = 0; i < reportCount; i++) {
                totalHeartRate += decryptedValues[i * 4];
                totalSystolic += decryptedValues[i * 4 + 1];
                totalGlucose += decryptedValues[i * 4 + 2];
            }

            // Calculate and encrypt averages
            period.averageHeartRate = FHE.asEuint8(uint8(totalHeartRate / reportCount));
            period.averageBloodPressure = FHE.asEuint8(uint8(totalSystolic / reportCount));
            period.averageGlucose = FHE.asEuint8(uint8(totalGlucose / reportCount));
            period.totalReports = FHE.asEuint16(uint16(reportCount));

            // Grant access permissions
            FHE.allowThis(period.averageHeartRate);
            FHE.allowThis(period.averageBloodPressure);
            FHE.allowThis(period.averageGlucose);
            FHE.allowThis(period.totalReports);
        }

        emit SummaryGenerated(currentPeriod, reportCount);

        // Move to next period
        currentPeriod++;
    }

    // Check for health alerts based on submitted values
    function _checkHealthAlerts(address patient, uint8 heartRate, uint8 systolic, uint8 glucose) private {
        // Heart rate alerts (normal range: 60-100 bpm)
        if (heartRate < 50 || heartRate > 120) {
            emit AlertTriggered(patient, currentPeriod, "Heart Rate Alert");
        }

        // Blood pressure alerts (normal systolic: < 130 mmHg)
        if (systolic > 140) {
            emit AlertTriggered(patient, currentPeriod, "High Blood Pressure Alert");
        }

        // Blood glucose alerts (normal fasting: 70-100 mg/dL)
        if (glucose < 60 || glucose > 140) {
            emit AlertTriggered(patient, currentPeriod, "Blood Glucose Alert");
        }
    }

    // Get current period information
    function getCurrentPeriodInfo() external view returns (
        uint32 period,
        uint256 startTime,
        uint256 endTime,
        bool periodActive,
        uint256 reporterCount
    ) {
        Period storage currentPeriodData = periods[currentPeriod];
        return (
            currentPeriod,
            currentPeriodData.startTime,
            currentPeriodData.endTime,
            currentPeriodData.periodActive,
            currentPeriodData.reporters.length
        );
    }

    // Check if patient has reported in current period
    function getPatientReportStatus(address patient) external view returns (
        bool hasReported,
        uint256 timestamp
    ) {
        HealthData storage report = healthReports[currentPeriod][patient];
        return (report.hasReported, report.timestamp);
    }

    // Get period history (for authorized doctors only)
    function getPeriodHistory(uint32 periodNumber) external view onlyAuthorizedDoctor returns (
        uint256 startTime,
        uint256 endTime,
        bool summaryGenerated,
        uint256 reporterCount
    ) {
        Period storage period = periods[periodNumber];
        return (
            period.startTime,
            period.endTime,
            period.summaryGenerated,
            period.reporters.length
        );
    }

    // Emergency access for critical health data (for authorized doctors)
    function requestEmergencyAccess(address patient, uint32 periodNumber) external onlyAuthorizedDoctor {
        require(healthReports[periodNumber][patient].hasReported, "No data for this patient");

        HealthData storage data = healthReports[periodNumber][patient];

        // Grant temporary access to doctor
        FHE.allow(data.heartRate, msg.sender);
        FHE.allow(data.bloodPressureSystolic, msg.sender);
        FHE.allow(data.bloodPressureDiastolic, msg.sender);
        FHE.allow(data.bloodGlucose, msg.sender);
        FHE.allow(data.temperature, msg.sender);
    }

    // Get time remaining in current period
    function getTimeRemainingInPeriod() external view returns (uint256) {
        if (!periods[currentPeriod].periodActive) return 0;
        if (block.timestamp >= periods[currentPeriod].endTime) return 0;
        return periods[currentPeriod].endTime - block.timestamp;
    }
}