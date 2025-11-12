"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { authenticateWithWallet, getAuthToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { WalletConnect } from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Alert } from "@/components/ui/alert";
import { Globe, Mail, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";

export default function PublishersPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    website_url: "",
    email: "",
    payment_wallet: "",
  });
  const [validationErrors, setValidationErrors] = useState<{
    website_url?: string;
    payment_wallet?: string;
  }>({});

  // Validate URL format
  const validateURL = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Ensure it's http or https
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setValidationErrors((prev) => ({
          ...prev,
          website_url: "URL must start with http:// or https://",
        }));
        return false;
      }
      setValidationErrors((prev) => {
        const { website_url, ...rest } = prev;
        return rest;
      });
      return true;
    } catch {
      setValidationErrors((prev) => ({
        ...prev,
        website_url: "Please enter a valid URL (e.g., https://example.com)",
      }));
      return false;
    }
  };

  // Validate Ethereum address format
  const validateAddress = (addr: string): boolean => {
    if (!addr) return true; // Optional field
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(addr);
    if (!isValid) {
      setValidationErrors((prev) => ({
        ...prev,
        payment_wallet:
          "Invalid Ethereum address format (must be 0x followed by 40 hex characters)",
      }));
      return false;
    }
    setValidationErrors((prev) => {
      const { payment_wallet, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setValidationErrors({});

    // Client-side validation
    if (!formData.email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!validateURL(formData.website_url)) {
      setLoading(false);
      return;
    }

    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet first");
      }

      const paymentWallet = formData.payment_wallet || address;
      if (paymentWallet && !validateAddress(paymentWallet)) {
        setLoading(false);
        return;
      }

      // Authenticate if not already authenticated
      let token = getAuthToken();
      if (!token) {
        await authenticateWithWallet(address, signMessageAsync as any);
        token = getAuthToken();
      }

      if (!token) {
        throw new Error("Authentication failed");
      }

      // Register publisher
      const result = await api.registerPublisher(
        {
          website_url: formData.website_url,
          email: formData.email,
          payment_wallet: paymentWallet || address,
        },
        token
      );

      setSuccess(true);
      console.log("Publisher registered:", result);

      // Pre-fetch verification token immediately (don't wait for it)
      // This way it's ready when user lands on verification page
      api
        .getVerificationToken(result.publisher.id, token)
        .then((tokenResult) => {
          // Cache it in sessionStorage for immediate use on verification page
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              `verification_token_${result.publisher.id}`,
              tokenResult.verification_token
            );
          }
        })
        .catch((err) => {
          // Silently fail - we'll fetch it again on verification page if needed
          console.log(
            "Pre-fetch token failed (will retry on verification page):",
            err
          );
        });

      // Auto-redirect to verification page after 1 second
      setTimeout(() => {
        router.push("/publishers/verify");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";

      // Handle duplicate registration gracefully
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("409")
      ) {
        setError("You're already registered. Redirecting to verification...");
        setTimeout(() => {
          router.push("/publishers/verify");
        }, 2000);
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-frosted-dark pt-24">
      <div className="w-full max-w-md mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-8">
          <h1 className="text-3xl font-bold text-white mb-2 scroll-mt-24">
            Become a Publisher
          </h1>
          <p className="text-white/60 mb-8">
            Monetize your website with crypto-native ads on BASE blockchain
          </p>

          {/* How It Works */}
          <section
            className="mb-8 p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl"
            aria-labelledby="how-it-works-heading"
          >
            <h2
              id="how-it-works-heading"
              className="text-xl font-semibold text-white mb-4"
            >
              How It Works
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">
                    Register Your Website
                  </h3>
                  <p className="text-white/80 text-sm">
                    Sign up with your website URL and connect your wallet
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">
                    Verify Domain Ownership
                  </h3>
                  <p className="text-white/80 text-sm">
                    Complete domain verification to ensure quality and trust
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">Start Earning</h3>
                  <p className="text-white/80 text-sm">
                    Our matching engine automatically connects you with premium
                    ads and you start earning with instant crypto payments
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why Publish Card - Integrated into header */}
          <section
            className="mb-8 p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl"
            aria-labelledby="why-publish-heading"
          >
            <h2
              id="why-publish-heading"
              className="text-xl font-semibold text-white mb-2"
            >
              Why Publish with Buzzer Network?
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Join a transparent, crypto-native advertising network built on
              BASE blockchain. Earn 85% of ad revenue with instant crypto
              payments directly to your wallet. Our quality-focused network
              ensures your site is matched with premium advertisers.
            </p>
          </section>

          {!isConnected && (
            <div className="mb-8">
              <p className="text-white/80 mb-4">
                Connect your wallet to get started:
              </p>
              <WalletConnect />
            </div>
          )}

          {isConnected && (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              aria-label="Publisher registration form"
            >
              {/* Step 1: Email - Always visible */}
              <div className="relative animate-in fade-in duration-300">
                <Label htmlFor="email" className="text-white/80 mb-2 block">
                  Email{" "}
                  <span className="text-white/60" aria-label="required">
                    *
                  </span>
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    required
                    variant="glass"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-12"
                    placeholder="publisher@example.com"
                    aria-describedby="email-help"
                  />
                </div>
                <p id="email-help" className="sr-only">
                  Email address for notifications
                </p>
              </div>

              {/* Step 2: Website URL - Show when email is filled */}
              {formData.email.trim() && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="website_url"
                    className="text-white/80 mb-2 block"
                  >
                    Website URL{" "}
                    <span className="text-white/60" aria-label="required">
                      *
                    </span>
                  </Label>
                  <div className="relative">
                    <Globe
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10"
                      aria-hidden="true"
                    />
                    <Input
                      id="website_url"
                      type="url"
                      required
                      variant="glass"
                      value={formData.website_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          website_url: e.target.value,
                        });
                        if (validationErrors.website_url) {
                          validateURL(e.target.value);
                        }
                      }}
                      onBlur={() => validateURL(formData.website_url)}
                      className="pl-12"
                      placeholder="https://example.com"
                      aria-describedby="website_url-help"
                    />
                  </div>
                  {validationErrors.website_url && (
                    <p className="mt-1 text-sm text-red-300" role="alert">
                      {validationErrors.website_url}
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Payment Wallet Address - Show when website URL is filled */}
              {formData.website_url && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="payment_wallet"
                    className="text-white/80 mb-2 block"
                  >
                    Payment Wallet Address
                  </Label>
                  <div className="relative">
                    <Wallet
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10"
                      aria-hidden="true"
                    />
                    <Input
                      id="payment_wallet"
                      type="text"
                      variant="glass"
                      value={formData.payment_wallet || address || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          payment_wallet: e.target.value,
                        });
                        if (validationErrors.payment_wallet) {
                          validateAddress(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (formData.payment_wallet) {
                          validateAddress(formData.payment_wallet);
                        }
                      }}
                      className="pl-12 font-mono text-sm"
                      placeholder={address || "0x..."}
                      aria-describedby="payment_wallet-help"
                    />
                  </div>
                  {validationErrors.payment_wallet && (
                    <p className="mt-1 text-sm text-red-300" role="alert">
                      {validationErrors.payment_wallet}
                    </p>
                  )}
                  <p
                    id="payment_wallet-help"
                    className="mt-1 text-sm text-white/60"
                  >
                    Leave empty to use connected wallet address
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="error" role="alert" aria-live="assertive">
                  {error}
                </Alert>
              )}

              {success && (
                <div className="space-y-4">
                  <Alert variant="success" role="status" aria-live="polite">
                    <div className="space-y-3">
                      <p className="font-semibold">Registration successful!</p>
                      <p>
                        You'll need to verify your domain ownership to start
                        earning.
                      </p>
                      <p className="text-sm opacity-80">
                        Redirecting to verification page in 1 second...
                      </p>
                    </div>
                  </Alert>
                  <Button
                    type="button"
                    variant="glass-dark"
                    size="lg"
                    onClick={() => router.push("/publishers/verify")}
                    className="w-full rounded-2xl h-14"
                  >
                    Verify Domain Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                variant="glass-dark"
                size="lg"
                disabled={loading}
                className="w-full rounded-2xl h-14"
              >
                {loading ? "Registering..." : "Register as Publisher"}
              </Button>
            </form>
          )}

          <section
            className="mt-8 pt-8 border-t border-white/10"
            aria-labelledby="benefits-heading"
          >
            <h2
              id="benefits-heading"
              className="text-lg font-semibold mb-4 text-white"
            >
              Benefits of Publishing with Buzzer Network
            </h2>
            <ul className="space-y-2 text-white/80" role="list">
              <li>✓ 85% revenue share (vs 30-40% from traditional networks)</li>
              <li>✓ Instant crypto payments (no net-30 delays)</li>
              <li>✓ Transparent on-chain records</li>
              <li>✓ Quality-focused publisher network</li>
              <li>✓ Domain verification ensures trust and quality</li>
              <li>✓ Smart contract automation for fair distribution</li>
            </ul>
          </section>
        </GlassCard>
      </div>
    </div>
  );
}
