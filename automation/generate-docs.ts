/**
 * @title Documentation Generator
 * @notice Automatically generates GitBook-compatible documentation from code annotations
 * @dev Parses TypeScript test files and Solidity contracts to extract documentation
 */

import * as fs from "fs";
import * as path from "path";

interface DocSection {
  title: string;
  description: string;
  chapter?: string;
  code?: string;
  concepts?: string[];
}

/**
 * Extract documentation from test file comments
 */
function extractTestDocs(testFilePath: string): DocSection[] {
  const content = fs.readFileSync(testFilePath, "utf-8");
  const sections: DocSection[] = [];

  // Match describe/it blocks with their JSDoc comments
  const testBlockRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:it|describe)\s*\(\s*["'](.*?)["']/g;

  let match;
  while ((match = testBlockRegex.exec(content)) !== null) {
    const [, comment, title] = match;

    const section: DocSection = {
      title: title.trim(),
      description: "",
      concepts: [],
    };

    // Extract description
    const noticeMatch = /@notice\s+(.*?)(?=@|\*\/)/s.exec(comment);
    if (noticeMatch) {
      section.description = noticeMatch[1].trim().replace(/\s+/g, " ");
    }

    // Extract chapter tag
    const chapterMatch = /@chapter\s+([\w-]+)/.exec(comment);
    if (chapterMatch) {
      section.chapter = chapterMatch[1];
    }

    // Extract dev notes (key concepts)
    const devMatch = /@dev\s+([\s\S]*?)(?=@|\*\/)/s.exec(comment);
    if (devMatch) {
      const devText = devMatch[1].trim();
      // Split by newlines and extract concepts
      const concepts = devText
        .split(/\n/)
        .map((line) => line.replace(/\s*\*\s*/, "").trim())
        .filter((line) => line.length > 0);
      section.concepts = concepts;
    }

    sections.push(section);
  }

  return sections;
}

/**
 * Extract contract documentation from Solidity files
 */
function extractContractDocs(contractPath: string): DocSection[] {
  const content = fs.readFileSync(contractPath, "utf-8");
  const sections: DocSection[] = [];

  // Extract contract-level comments
  const contractCommentRegex = /\/\/\s*(.+)$/gm;
  let match;

  while ((match = contractCommentRegex.exec(content)) !== null) {
    const comment = match[1].trim();
    if (comment.length > 10) {
      sections.push({
        title: "Contract Documentation",
        description: comment,
      });
    }
  }

  return sections;
}

/**
 * Group sections by chapter
 */
function groupByChapter(sections: DocSection[]): Map<string, DocSection[]> {
  const chapters = new Map<string, DocSection[]>();

  for (const section of sections) {
    const chapter = section.chapter || "general";
    if (!chapters.has(chapter)) {
      chapters.set(chapter, []);
    }
    chapters.get(chapter)!.push(section);
  }

  return chapters;
}

/**
 * Generate markdown content
 */
function generateMarkdown(chapters: Map<string, DocSection[]>, projectName: string): string {
  let markdown = `# ${projectName}\n\n`;

  markdown += "## Overview\n\n";
  markdown += "This example demonstrates a privacy-preserving health monitoring system using FHEVM (Fully Homomorphic Encryption Virtual Machine).\n\n";

  markdown += "## Table of Contents\n\n";
  for (const [chapter] of chapters) {
    markdown += `- [${toTitleCase(chapter)}](#${chapter})\n`;
  }
  markdown += "\n";

  // Generate content for each chapter
  for (const [chapter, sections] of chapters) {
    markdown += `## ${toTitleCase(chapter)}\n\n`;

    for (const section of sections) {
      markdown += `### ${section.title}\n\n`;

      if (section.description) {
        markdown += `${section.description}\n\n`;
      }

      if (section.concepts && section.concepts.length > 0) {
        markdown += "**Key Concepts:**\n\n";
        for (const concept of section.concepts) {
          markdown += `- ${concept}\n`;
        }
        markdown += "\n";
      }

      if (section.code) {
        markdown += "```typescript\n";
        markdown += section.code;
        markdown += "\n```\n\n";
      }
    }
  }

  return markdown;
}

/**
 * Convert kebab-case or snake_case to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate comprehensive README
 */
function generateReadme(projectName: string, description: string): string {
  let readme = `# ${projectName}\n\n`;

  readme += `${description}\n\n`;

  readme += "## Features\n\n";
  readme += "- ✅ **Encrypted Health Data**: Patient health metrics are encrypted using FHE\n";
  readme += "- ✅ **Access Control**: Role-based access for patients, doctors, and administrators\n";
  readme += "- ✅ **Period-Based Reporting**: 24-hour reporting periods with aggregated statistics\n";
  readme += "- ✅ **Health Alerts**: Automatic alerts for abnormal vital signs\n";
  readme += "- ✅ **Emergency Access**: Doctors can request emergency access to patient data\n";
  readme += "- ✅ **Data Aggregation**: Privacy-preserving statistics generation\n\n";

  readme += "## FHEVM Concepts Demonstrated\n\n";
  readme += "This example showcases several important FHEVM patterns:\n\n";
  readme += "1. **Encryption**: Converting plaintext values to encrypted values using `FHE.asEuint8()`\n";
  readme += "2. **Access Control**: Managing who can access encrypted data using `FHE.allow()`\n";
  readme += "3. **Self-Access**: Granting contract access to its own encrypted values with `FHE.allowThis()`\n";
  readme += "4. **Public Decryption**: Requesting decryption for aggregation using `FHE.requestDecryption()`\n";
  readme += "5. **Signature Verification**: Verifying decrypted values with `FHE.checkSignatures()`\n\n";

  readme += "## Installation\n\n";
  readme += "```bash\n";
  readme += "# Install dependencies\n";
  readme += "npm install\n";
  readme += "\n";
  readme += "# Copy environment variables\n";
  readme += "cp .env.example .env\n";
  readme += "# Edit .env with your values\n";
  readme += "```\n\n";

  readme += "## Compilation\n\n";
  readme += "```bash\n";
  readme += "npm run compile\n";
  readme += "```\n\n";

  readme += "## Testing\n\n";
  readme += "```bash\n";
  readme += "# Run all tests\n";
  readme += "npm test\n";
  readme += "\n";
  readme += "# Run with coverage\n";
  readme += "npm run test:coverage\n";
  readme += "```\n\n";

  readme += "## Deployment\n\n";
  readme += "```bash\n";
  readme += "# Deploy to Sepolia testnet\n";
  readme += "npm run deploy:sepolia\n";
  readme += "\n";
  readme += "# Deploy to local hardhat network\n";
  readme += "npm run deploy:local\n";
  readme += "```\n\n";

  readme += "## Usage\n\n";
  readme += "### 1. Authorize Users\n\n";
  readme += "```typescript\n";
  readme += "// Authorize a patient\n";
  readme += "await monitor.authorizePatient(patientAddress);\n";
  readme += "\n";
  readme += "// Authorize a doctor\n";
  readme += "await monitor.authorizeDoctor(doctorAddress);\n";
  readme += "```\n\n";

  readme += "### 2. Start Reporting Period\n\n";
  readme += "```typescript\n";
  readme += "// Start a new 24-hour reporting period\n";
  readme += "await monitor.startNewPeriod();\n";
  readme += "```\n\n";

  readme += "### 3. Submit Health Data\n\n";
  readme += "```typescript\n";
  readme += "// Patient submits encrypted health data\n";
  readme += "await monitor.submitHealthData(\n";
  readme += "  75,  // heart rate (BPM)\n";
  readme += "  120, // systolic BP (mmHg)\n";
  readme += "  80,  // diastolic BP (mmHg)\n";
  readme += "  90,  // glucose (mg/dL)\n";
  readme += "  98   // temperature (°F)\n";
  readme += ");\n";
  readme += "```\n\n";

  readme += "### 4. Generate Period Summary\n\n";
  readme += "```typescript\n";
  readme += "// After period ends, doctor generates summary\n";
  readme += "await monitor.generatePeriodSummary();\n";
  readme += "```\n\n";

  readme += "## Contract Architecture\n\n";
  readme += "### Key Components\n\n";
  readme += "- **HealthData**: Stores encrypted patient vitals\n";
  readme += "- **Period**: Manages reporting periods and aggregated data\n";
  readme += "- **Access Control**: Role-based permissions (patients, doctors, owner)\n";
  readme += "- **Alert System**: Automatic health alerts based on thresholds\n\n";

  readme += "### Data Flow\n\n";
  readme += "1. Owner authorizes patients and doctors\n";
  readme += "2. Owner starts a new reporting period\n";
  readme += "3. Patients submit encrypted health data during period\n";
  readme += "4. Contract checks for health alerts\n";
  readme += "5. After period ends, doctor requests summary generation\n";
  readme += "6. Contract decrypts data, calculates averages, re-encrypts results\n\n";

  readme += "## Security Considerations\n\n";
  readme += "- All health data is encrypted using FHE\n";
  readme += "- Access control enforced at function level\n";
  readme += "- Patients can only submit once per period\n";
  readme += "- Emergency access logged for audit trails\n";
  readme += "- Decryption signatures verified before processing\n\n";

  readme += "## Testing\n\n";
  readme += "The test suite covers:\n\n";
  readme += "- ✅ Access control patterns\n";
  readme += "- ✅ Period management lifecycle\n";
  readme += "- ✅ Encrypted data submission\n";
  readme += "- ✅ Health alert triggering\n";
  readme += "- ✅ Summary generation and aggregation\n";
  readme += "- ✅ Emergency access patterns\n";
  readme += "- ✅ Multi-period workflows\n";
  readme += "- ✅ Edge cases and error handling\n\n";

  readme += "## License\n\n";
  readme += "MIT\n\n";

  readme += "## Resources\n\n";
  readme += "- [FHEVM Documentation](https://docs.zama.ai/fhevm)\n";
  readme += "- [Zama GitHub](https://github.com/zama-ai)\n";
  readme += "- [Hardhat Documentation](https://hardhat.org/docs)\n\n";

  return readme;
}

/**
 * Main execution
 */
async function main() {
  console.log("📚 Generating documentation...\n");

  const projectRoot = path.resolve(__dirname, "..");
  const testFile = path.join(projectRoot, "test", "PrivacyHealthMonitor.test.ts");
  const contractFile = path.join(projectRoot, "contracts", "PrivacyHealthMonitor.sol");
  const docsDir = path.join(projectRoot, "docs");

  // Create docs directory if it doesn't exist
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Extract documentation from test file
  console.log("📖 Extracting test documentation...");
  const testSections = extractTestDocs(testFile);
  console.log(`Found ${testSections.length} documented test sections\n`);

  // Group by chapter
  const chapters = groupByChapter(testSections);
  console.log(`Organized into ${chapters.size} chapters\n`);

  // Generate documentation markdown
  console.log("✍️  Generating documentation markdown...");
  const docMarkdown = generateMarkdown(chapters, "Privacy Health Monitor");
  fs.writeFileSync(path.join(docsDir, "EXAMPLES.md"), docMarkdown);
  console.log("✅ Generated docs/EXAMPLES.md\n");

  // Generate README
  console.log("✍️  Generating README...");
  const readme = generateReadme(
    "FHEVM Privacy Health Monitor",
    "A privacy-preserving health monitoring system built with FHEVM that allows patients to submit encrypted health data and enables doctors to access aggregated statistics without compromising individual privacy."
  );
  fs.writeFileSync(path.join(projectRoot, "README.md"), readme);
  console.log("✅ Generated README.md\n");

  // Generate summary
  console.log("📊 Documentation Summary:");
  console.log(`- ${testSections.length} test sections documented`);
  console.log(`- ${chapters.size} chapters created`);
  console.log(`- Files generated:`);
  console.log(`  - README.md`);
  console.log(`  - docs/EXAMPLES.md`);

  console.log("\n✅ Documentation generation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Documentation generation failed:", error);
    process.exit(1);
  });
