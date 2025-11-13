/**
 * Smart Contract Service
 * Handles interactions with deployed contracts on BASE
 */

import { ethers } from 'ethers';
import { dbPool } from '../config/database.js';

// Contract ABIs (simplified - in production, import from typechain)
const PAYMENT_ESCROW_ABI = [
  'function deposit(uint256 campaignId, address token) payable',
  'function withdraw(uint256 campaignId, address token, uint256 amount)',
  'function spend(uint256 campaignId, address token, uint256 amount)',
  'function getBalance(uint256 campaignId, address token) view returns (uint256)',
  'function getTotalSpent(uint256 campaignId, address token) view returns (uint256)',
];

const PUBLISHER_PAYOUT_ABI = [
  'function payout(address publisher, address token, uint256 amount)',
  'function batchPayout(tuple(address publisher, address token, uint256 amount)[] payouts)',
  'function getTotalPaid(address publisher, address token) view returns (uint256)',
];

// Contract addresses (from environment or deployment)
const PAYMENT_ESCROW_ADDRESS = process.env.PAYMENT_ESCROW_ADDRESS || '';
const PUBLISHER_PAYOUT_ADDRESS = process.env.PUBLISHER_PAYOUT_ADDRESS || '';
const AUTHORIZED_BACKEND_ADDRESS = process.env.AUTHORIZED_BACKEND_ADDRESS || '';

// Provider setup
const getProvider = () => {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get signer (authorized backend wallet)
const getSigner = () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

/**
 * Get contract instances
 */
function getPaymentEscrowContract() {
  const signer = getSigner();
  return new ethers.Contract(PAYMENT_ESCROW_ADDRESS, PAYMENT_ESCROW_ABI, signer);
}

function getPublisherPayoutContract() {
  const signer = getSigner();
  return new ethers.Contract(PUBLISHER_PAYOUT_ADDRESS, PUBLISHER_PAYOUT_ABI, signer);
}

/**
 * Fund campaign (advertiser deposits to escrow)
 * Note: This should be called from frontend with advertiser's wallet
 * Backend provides the transaction data
 */
export async function prepareCampaignFunding(
  campaignId: string,
  amount: string,
  tokenAddress: string = '0x0000000000000000000000000000000000000001' // Native ETH
) {
  try {
    const contract = getPaymentEscrowContract();
    const amountWei = ethers.parseEther(amount);
    
    // Return transaction data for frontend to execute
    return {
      to: PAYMENT_ESCROW_ADDRESS,
      data: contract.interface.encodeFunctionData('deposit', [campaignId, tokenAddress]),
      value: amountWei.toString(),
    };
  } catch (error) {
    console.error('Prepare funding error:', error);
    throw error;
  }
}

/**
 * Execute payout to publisher (authorized backend only)
 */
export async function executePublisherPayout(
  publisherAddress: string,
  amount: string,
  tokenAddress: string = '0x0000000000000000000000000000000000000001'
): Promise<string> {
  try {
    const contract = getPublisherPayoutContract();
    const amountWei = ethers.parseEther(amount);
    
    const tx = await contract.payout(publisherAddress, tokenAddress, amountWei);
    await tx.wait();
    
    return tx.hash;
  } catch (error) {
    console.error('Payout execution error:', error);
    throw error;
  }
}

/**
 * Execute batch payouts (gas optimized)
 */
export async function executeBatchPayouts(
  payouts: Array<{ publisher: string; amount: string; token: string }>
): Promise<string> {
  try {
    const contract = getPublisherPayoutContract();
    
    // Convert amounts to wei
    const formattedPayouts = payouts.map(p => ({
      publisher: p.publisher,
      token: p.token || '0x0000000000000000000000000000000000000001',
      amount: ethers.parseEther(p.amount),
    }));
    
    const tx = await contract.batchPayout(formattedPayouts);
    await tx.wait();
    
    return tx.hash;
  } catch (error) {
    console.error('Batch payout error:', error);
    throw error;
  }
}

/**
 * Get campaign balance from contract
 */
export async function getCampaignBalance(
  campaignId: string,
  tokenAddress: string = '0x0000000000000000000000000000000000000001'
): Promise<string> {
  try {
    const contract = getPaymentEscrowContract();
    const balance = await contract.getBalance(campaignId, tokenAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Get balance error:', error);
    return '0';
  }
}

/**
 * Get total spent for campaign
 */
export async function getCampaignSpent(
  campaignId: string,
  tokenAddress: string = '0x0000000000000000000000000000000000000001'
): Promise<string> {
  try {
    const contract = getPaymentEscrowContract();
    const spent = await contract.getTotalSpent(campaignId, tokenAddress);
    return ethers.formatEther(spent);
  } catch (error) {
    console.error('Get spent error:', error);
    return '0';
  }
}

/**
 * Spend from campaign (authorized backend only)
 * Called when impressions/clicks are logged
 */
export async function spendFromCampaign(
  campaignId: string,
  amount: string,
  tokenAddress: string = '0x0000000000000000000000000000000000000001'
): Promise<void> {
  try {
    const contract = getPaymentEscrowContract();
    const amountWei = ethers.parseEther(amount);
    
    const tx = await contract.spend(campaignId, tokenAddress, amountWei);
    await tx.wait();
    
    console.log(`Spent ${amount} from campaign ${campaignId}`);
  } catch (error) {
    console.error('Spend from campaign error:', error);
    // Don't throw - allow off-chain tracking to continue
    // In production, implement retry logic
  }
}




