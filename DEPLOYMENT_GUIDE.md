# Deployment Guide

This guide walks you through deploying the Privacy Health Monitor contract to different networks.

## Prerequisites

1. Node.js >= 18.0.0
2. npm >= 9.0.0
3. MetaMask or another Web3 wallet
4. Test ETH for deployment

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key (optional)
   ```

   **⚠️ Security Warning**: Never commit your `.env` file or expose your private key!

## Getting Test ETH

For Sepolia testnet:
1. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Request test ETH

## Deployment Steps

### 1. Compile Contracts

```bash
npm run compile
```

This will:
- Compile all Solidity contracts
- Generate TypeScript types
- Output to `artifacts/` directory

### 2. Run Tests (Optional but Recommended)

```bash
npm test
```

Ensure all tests pass before deploying.

### 3. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

The deployment script will:
- Display your deployer address and balance
- Deploy the PrivacyHealthMonitor contract
- Show the deployed contract address
- Display initial contract state
- Provide verification command

**Save the contract address!** You'll need it for interaction and frontend integration.

### 4. Verify Contract on Etherscan (Optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

This makes your contract source code publicly viewable and verifiable.

## Post-Deployment Setup

After deploying, you need to set up the contract:

### 1. Authorize Initial Users

```typescript
// Using the interact script
const monitor = await ethers.getContractAt("PrivacyHealthMonitor", CONTRACT_ADDRESS);

// Authorize a patient
await monitor.authorizePatient("0xPatientAddress");

// Authorize a doctor
await monitor.authorizeDoctor("0xDoctorAddress");
```

### 2. Start First Reporting Period

```typescript
await monitor.startNewPeriod();
```

### 3. Update Frontend Configuration

If using the included frontend:

1. Open `index.html`
2. Update the contract address in the JavaScript section
3. Or use the contract address input field in the UI

## Local Development Deployment

For testing locally:

1. Start a local Hardhat node:
   ```bash
   npm run node
   ```

2. In a new terminal, deploy to local network:
   ```bash
   npm run deploy:local
   ```

3. The local node provides 20 test accounts with ETH

## Interacting with Deployed Contract

### Using Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
const monitor = await ethers.getContractAt(
  "PrivacyHealthMonitor",
  "YOUR_CONTRACT_ADDRESS"
);

// Check current period
const currentPeriod = await monitor.currentPeriod();
console.log("Current period:", currentPeriod);

// Get period info
const [period, startTime, endTime, active, reportCount] =
  await monitor.getCurrentPeriodInfo();
console.log("Period info:", { period, startTime, endTime, active, reportCount });
```

### Using Interaction Script

Update `scripts/interact.ts` with your contract address and run:

```bash
npx hardhat run scripts/interact.ts --network sepolia
```

### Using Frontend

1. Open `index.html` in a browser
2. Connect your MetaMask wallet
3. Switch to Sepolia network
4. Enter the contract address
5. Use the interface to interact

## Troubleshooting

### Insufficient Funds

**Error**: "sender doesn't have enough funds to send tx"

**Solution**: Get more test ETH from a faucet

### Gas Estimation Failed

**Error**: "cannot estimate gas"

**Solution**:
- Check that you're authorized to call the function
- Verify function parameters are correct
- Ensure any time-based conditions are met

### Wrong Network

**Error**: "network does not match"

**Solution**:
- Check your `.env` configuration
- Verify MetaMask is on the correct network
- Ensure RPC URL is correct

### Contract Not Found

**Error**: "Contract at address not found"

**Solution**:
- Verify the contract address is correct
- Check you're on the correct network
- Ensure deployment completed successfully

## Network Information

### Sepolia Testnet

- Chain ID: 11155111
- RPC URL: https://sepolia.infura.io/v3/
- Block Explorer: https://sepolia.etherscan.io/
- Faucet: https://sepoliafaucet.com/

### Local Hardhat Network

- Chain ID: 31337
- RPC URL: http://127.0.0.1:8545/
- Pre-funded accounts: 20
- Account balance: 10000 ETH each

## Gas Optimization Tips

To reduce deployment and transaction costs:

1. Enable Solidity optimizer (already configured)
2. Batch operations when possible
3. Use events for data that doesn't need on-chain storage
4. Test on local network first

## Security Checklist

Before deploying to mainnet:

- [ ] All tests pass
- [ ] Code has been audited
- [ ] Private keys are secure
- [ ] `.env` file is not committed
- [ ] Access control is properly configured
- [ ] Emergency procedures are documented
- [ ] Monitoring is in place

## Monitoring Deployed Contract

### Using Events

Monitor contract events using ethers.js:

```typescript
monitor.on("HealthDataSubmitted", (patient, period) => {
  console.log(`Patient ${patient} submitted data for period ${period}`);
});

monitor.on("AlertTriggered", (patient, period, alertType) => {
  console.log(`Alert: ${alertType} for patient ${patient}`);
});
```

### Using Block Explorer

Visit your contract on Etherscan:
- View transactions
- See event logs
- Monitor contract state
- Verify source code

## Upgrading Contract

This contract is not upgradeable. To deploy a new version:

1. Update the contract code
2. Deploy new contract
3. Migrate data if needed
4. Update all references to new address
5. Communicate changes to users

## Support

For deployment issues:
- Check Hardhat documentation
- Review error messages carefully
- Open an issue on GitHub
- Ask in the Zama community

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Sepolia Testnet Info](https://sepolia.dev/)
