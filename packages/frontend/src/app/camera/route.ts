/**
 * Camera Route for Coinbase Wallet SDK
 * Coinbase Wallet SDK checks Cross-Origin-Opener-Policy on this endpoint
 * This is a simple health check endpoint
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Return a simple response for Coinbase Wallet SDK COOP check
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  });
}

export async function HEAD() {
  // Coinbase Wallet SDK also does a HEAD request
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  });
}



