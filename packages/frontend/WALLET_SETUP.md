# Wallet Configuration Setup

## Fixed Issues

### 1. ✅ Camera Route (404 Error)
**Problem**: Coinbase Wallet SDK was trying to access `/camera` endpoint to check Cross-Origin-Opener-Policy, but the route didn't exist.

**Solution**: Created `/app/camera/route.ts` that returns proper COOP headers for Coinbase Wallet SDK compatibility.

### 2. ✅ WalletConnect Project ID Missing
**Problem**: WalletConnect/Reown was trying to fetch config without a project ID, causing 403 errors.

**Solution**: Updated `wallet.ts` to only include WalletConnect connector if project ID is configured. Added helpful warning message.

### 3. ✅ MetaMask SDK Async Storage Warning
**Problem**: MetaMask SDK was looking for React Native async-storage module, which isn't needed for web.

**Solution**: Added webpack fallback in `next.config.js` to suppress this warning.

---

## Environment Variables

### Required for Full Functionality

Create a `.env.local` file in `packages/frontend/`:

```env
# WalletConnect Project ID (optional but recommended)
# Get one at: https://cloud.reown.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# API URL (defaults to localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# BASE Network (defaults to base-sepolia)
NEXT_PUBLIC_BASE_NETWORK=base-sepolia
```

### Getting a WalletConnect Project ID

1. Go to https://cloud.reown.com (formerly walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env.local` file

**Note**: WalletConnect is optional. MetaMask and Coinbase Wallet will work without it.

---

## Supported Wallets

### Always Available
- ✅ **MetaMask** - Works without any configuration
- ✅ **Coinbase Wallet** - Works without any configuration

### Optional
- ⚠️ **WalletConnect** - Requires project ID (get from https://cloud.reown.com)

---

## Remaining Console Warnings (Safe to Ignore)

These are non-critical warnings that don't affect functionality:

1. **Lit dev mode warning** - Library development mode, doesn't affect production
2. **Coinbase analytics errors** - Analytics blocked by ad blockers, not an issue
3. **WalletConnect API 403** - Only happens if project ID is missing (WalletConnect won't work but other wallets will)

---

## Testing

After setup, you should be able to:
1. Connect with MetaMask ✅
2. Connect with Coinbase Wallet ✅
3. Connect with WalletConnect (if project ID configured) ✅
4. No more 404 errors for `/camera` ✅
5. No more async-storage warnings ✅




