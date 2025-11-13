/**
 * Authentication Middleware
 * Wallet signature verification for crypto-native authentication
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  walletAddress?: string;
  userId?: string;
}

/**
 * Verify wallet signature
 */
export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate authentication message for wallet signing
 */
export function generateAuthMessage(address: string, nonce: string): string {
  return `Please sign this message to authenticate with Buzzer Network.

Address: ${address}
Nonce: ${nonce}
Timestamp: ${Date.now()}

This request will not trigger any blockchain transaction.`;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(walletAddress: string, userId?: string): string {
  return jwt.sign(
    { walletAddress, userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { walletAddress: string; userId?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { walletAddress: string; userId?: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Verifies wallet signature or JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Check for Bearer token (JWT)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.walletAddress = decoded.walletAddress;
      req.userId = decoded.userId;
      return next();
    }

    // Check for wallet signature
    const { address, message, signature } = req.body;
    
    if (!address || !message || !signature) {
      return res.status(401).json({
        error: 'Missing wallet authentication',
        required: ['address', 'message', 'signature'],
      });
    }

    const isValid = await verifyWalletSignature(address, message, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    req.walletAddress = address;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Optional authentication (for endpoints that work with or without auth)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        req.walletAddress = decoded.walletAddress;
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth if optional
    next();
  }
};




