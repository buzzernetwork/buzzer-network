# Buzzer Network

**X402-based Decentralized Ad Network on BASE Blockchain**

Buzzer Network is a decentralized ad network that connects advertisers directly with premium publishers using the X402 protocol standard, enabling crypto-native payments and transparent revenue sharing.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for database)
- Redis (for caching)
- MetaMask or compatible wallet

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev
```

## 📁 Project Structure

```
buzzer-network/
├── packages/
│   ├── frontend/          # Next.js frontend
│   ├── backend/           # Express backend
│   └── contracts/         # Hardhat smart contracts
├── docs/                  # Documentation
└── README.md
```

## 🎯 Current Status

✅ **Foundation Complete**
- Monorepo structure initialized
- All packages configured
- Dependencies installed
- Smart contracts compiled
- Wallet connection ready
- X402 middleware structure ready

🔄 **In Progress**
- X402 SDK integration
- Database setup
- Matching engine

## 📦 Packages

### Frontend (`packages/frontend`)
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: wagmi + viem (BASE network)
- **Status**: ✅ Wallet connection ready

### Backend (`packages/backend`)
- **Framework**: Express.js
- **Language**: TypeScript
- **Endpoints**: Health check, X402 ad endpoint
- **Status**: ✅ Basic server ready

### Contracts (`packages/contracts`)
- **Framework**: Hardhat
- **Network**: BASE (Sepolia testnet + Mainnet)
- **Contracts**: PaymentEscrow, PublisherPayout
- **Status**: ✅ Compiled and tested

## 🧪 Testing

### Contracts
```bash
cd packages/contracts
npm run test
```

### Backend
```bash
cd packages/backend
npm run dev
# Test: http://localhost:3001/health
# Test: http://localhost:3001/x402/ad?pub_id=test&slot_id=test&format=banner
```

### Frontend
```bash
cd packages/frontend
npm run dev
# Open: http://localhost:3000
```

## 📚 Documentation

Documentation is organized in the `docs/` directory:

### Setup & Configuration
- **Quick Database Setup**: `docs/08_setup/QUICK_DB_SETUP.md` (Supabase)
- **Database Connection Guide**: `docs/08_setup/DATABASE_CONNECTION_GUIDE.md`
- **Complete Setup Guide**: `docs/08_setup/SETUP.md`

### Implementation
- **Implementation Status**: `docs/06_implementation/IMPLEMENTATION_STATUS.md`
- **Next Steps**: `docs/06_implementation/NEXT_STEPS.md`
- **Critical Considerations**: `docs/06_implementation/critical_considerations_implementation.md`
- **X402 Setup Guide**: `docs/06_implementation/x402_setup_guide.md`

### Testing
- **Test Reports**: `docs/07_testing/TEST_REPORT.md`
- **Endpoint Tests**: `docs/07_testing/ENDPOINT_TEST_SUMMARY.md`
- **Core Flow Tests**: `docs/07_testing/CORE_FLOW_TEST_RESULTS.md`

### Architecture & Planning
- **Architecture**: `docs/03_architecture/r06_arch_L2.txt`
- **TDD Plan**: `docs/04_development/r08_TDD_v1.txt`
- **Product Requirements**: `docs/02_product/r04_prd_v2.txt`

## 🔗 Key Resources

- [X402 Protocol Docs](https://docs.cdp.coinbase.com/x402/)
- [BASE Blockchain Docs](https://docs.base.org/)
- [Coinbase X402 GitHub](https://github.com/coinbase/x402)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 📝 Development Status

**Current Phase**: Core Setup & X402 Integration

See `docs/06_implementation/IMPLEMENTATION_STATUS.md` for detailed status and `docs/06_implementation/NEXT_STEPS.md` for action items.

## 🤝 Contributing

This is an early-stage project. See documentation for implementation guidelines.

## 📄 License

[To be determined]

---

**Built with ❤️ for the decentralized web**
