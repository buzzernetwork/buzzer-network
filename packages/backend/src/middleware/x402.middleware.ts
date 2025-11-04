/**
 * X402 Protocol Middleware
 * Handles HTTP 402 Payment Required status code
 * 
 * Implements X402 protocol for BASE network with payment verification
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

export interface X402PaymentRequest {
  address: string;
  amount: string;
  token: 'ETH' | 'USDC';
  paymentUrl?: string;
  txHash?: string;
}

// BASE network configuration
const BASE_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const BASE_NETWORK = process.env.BASE_NETWORK || 'base-sepolia';

// X402 Payment escrow address (if using a facilitator)
const X402_FACILITATOR_ADDRESS = process.env.X402_FACILITATOR_ADDRESS;

/**
 * Get BASE network provider
 */
function getBaseProvider(): ethers.JsonRpcProvider {
  const rpcUrl = BASE_NETWORK === 'base-mainnet' ? BASE_MAINNET_RPC_URL : BASE_RPC_URL;
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Check if payment is required for this request
 * For MVP: Payment not required, but structure ready for future implementation
 */
async function checkPaymentRequired(
  req: Request
): Promise<X402PaymentRequest | null> {
  // Check for payment header (X402 protocol)
  const paymentHeader = req.headers['x-payment-required'];
  const paymentTxHash = req.headers['x-payment-tx'] as string;

  // If payment transaction hash provided, verify it
  if (paymentTxHash) {
    const verified = await verifyX402Payment({
      txHash: paymentTxHash,
      address: req.headers['x-payment-address'] as string || '',
      amount: req.headers['x-payment-amount'] as string || '0',
      token: (req.headers['x-payment-token'] as 'ETH' | 'USDC') || 'ETH',
    });

    if (verified) {
      return null; // Payment verified, proceed
    }
  }

  // For MVP: No payment required
  // In production, this would check campaign funding status, publisher requirements, etc.
  if (paymentHeader === 'true') {
    return {
      address: X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
      amount: '0.001', // Example micropayment amount
      token: 'USDC',
      paymentUrl: `${process.env.API_URL || 'http://localhost:3001'}/x402/pay`,
    };
  }

  return null;
}

/**
 * X402 Middleware
 * Returns 402 Payment Required when payment is needed
 */
export const x402Middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentRequired = await checkPaymentRequired(req);
    
    if (paymentRequired) {
      // Return 402 Payment Required (X402 standard)
      return res.status(402).json({
        error: 'Payment Required',
        payment_address: paymentRequired.address,
        amount: paymentRequired.amount,
        token: paymentRequired.token,
        x402_payment_url: paymentRequired.paymentUrl || `${process.env.API_URL}/x402/pay`,
      });
    }
    
    next();
  } catch (error) {
    console.error('X402 Middleware Error:', error);
    next(error);
  }
};

/**
 * X402 Payment Verification
 * Verifies payment was made on-chain on BASE network
 */
export async function verifyX402Payment(
  paymentRequest: X402PaymentRequest & { txHash: string }
): Promise<boolean> {
  try {
    const provider = getBaseProvider();
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(paymentRequest.txHash);
    
    if (!receipt) {
      console.log('X402 Payment: Transaction not found');
      return false;
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      console.log('X402 Payment: Transaction failed');
      return false;
    }

    // Verify transaction is on BASE network
    const network = await provider.getNetwork();
    const expectedChainId = BASE_NETWORK === 'base-mainnet' ? 8453n : 84532n;
    
    if (network.chainId !== expectedChainId) {
      console.log(`X402 Payment: Wrong network. Expected ${expectedChainId}, got ${network.chainId}`);
      return false;
    }

    // Verify amount (if payment address is specified)
    if (paymentRequest.address && paymentRequest.amount) {
      // Check if transaction value matches expected amount
      const tx = await provider.getTransaction(paymentRequest.txHash);
      const expectedAmount = ethers.parseEther(paymentRequest.amount);
      
      // For USDC, would need to check ERC20 transfer events
      // For ETH, check tx.value
      if (paymentRequest.token === 'ETH' && tx && tx.value !== expectedAmount) {
        console.log(`X402 Payment: Amount mismatch. Expected ${paymentRequest.amount}, got ${ethers.formatEther(tx.value)}`);
        return false;
      }
    }

    console.log('X402 Payment: Verification successful');
    return true;
  } catch (error) {
    console.error('X402 Payment Verification Error:', error);
    return false;
  }
}

