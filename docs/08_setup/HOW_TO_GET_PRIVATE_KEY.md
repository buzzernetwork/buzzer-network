# How to Get Your Private Key

## Option 1: From Existing Wallet (MetaMask, Coinbase Wallet, etc.)

### MetaMask:
1. Open MetaMask extension
2. Click the **three dots** (⋮) next to your account name
3. Select **"Account details"**
4. Click **"Export Private Key"**
5. Enter your password
6. Copy the private key (starts with `0x`)

### Coinbase Wallet:
1. Open Coinbase Wallet
2. Go to **Settings** → **Security & Privacy**
3. Select **"Export Private Key"**
4. Verify with password/biometric
5. Copy the private key

### Other Wallets:
- Look for "Export Private Key" or "Show Private Key" in settings
- Usually under Security or Account settings

---

## Option 2: Create a New Wallet (Recommended for Testing)

You can create a new wallet specifically for contract deployment:

### Using Node.js (Quick Method):
```bash
node -e "const { ethers } = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

### Using MetaMask:
1. Open MetaMask
2. Click **"Create Account"** or **"Add Account"**
3. Follow the setup process
4. Export the private key (see Option 1)

---

## Option 3: Use Hardhat's Built-in Accounts (Local Testing Only)

For local testing, Hardhat provides test accounts, but for BASE Sepolia deployment, you need a real wallet with ETH.

---

## Important Security Notes

⚠️ **NEVER share your private key publicly!**
- Private key = full control of wallet
- Anyone with it can steal your funds
- Only use for testnet wallets or dedicated deployment wallets

✅ **Best Practices:**
- Use a separate wallet for contract deployment
- Only fund it with the minimum ETH needed
- Never commit private keys to git
- Use environment variables (`.env` file)
- Add `.env` to `.gitignore`

---

## After Getting Your Private Key

1. **Add to .env file:**
   ```bash
   PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
   ```

2. **Make sure wallet has BASE Sepolia ETH:**
   - Get from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Need at least 0.01 ETH for gas fees

3. **Verify the address:**
   - Check balance on BaseScan: https://sepolia-explorer.base.org/address/YOUR_ADDRESS

---

## Quick Check: Do You Have a Wallet?

If you don't have a wallet yet:

1. **Install MetaMask** (easiest):
   - Chrome: https://chrome.google.com/webstore/detail/metamask
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/
   - Create new wallet
   - Save seed phrase securely
   - Export private key (see Option 1 above)

2. **Get Testnet ETH:**
   - Switch network to "Base Sepolia" in MetaMask
   - Get ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - You'll need the wallet address

---

## Need Help?

If you're stuck:
1. Do you have MetaMask or another wallet installed?
2. Do you have a wallet with BASE Sepolia ETH?
3. Need help creating a new wallet?

Let me know and I'll guide you through it!


