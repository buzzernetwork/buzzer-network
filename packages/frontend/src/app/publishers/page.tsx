"use client";

import { useState, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
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
  const [prefetchingToken, setPrefetchingToken] = useState(false);

  // Fix hydration mismatch - only render form after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user already has a publisher account and redirect to dashboard
  useEffect(() => {
    async function checkExistingPublisher() {
      if (!isConnected || !address || !mounted) {
        return;
      }

      setCheckingAccount(true);
      
      try {
        // Try to get auth token
        let token = getAuthToken();
        
        // If no token, try to authenticate silently
        if (!token) {
          try {
            await authenticateWithWallet(address, signMessageAsync as any);
            token = getAuthToken();
          } catch {
            // Authentication failed, user needs to connect/sign
            setCheckingAccount(false);
            return;
          }
        }

        if (!token) {
          setCheckingAccount(false);
          return;
        }

        // Check if publisher account exists
        const publisherResult = await api.getPublisher(token);
        
        if (publisherResult.publisher?.id) {
          // Publisher account exists - redirect to dashboard
          console.log('Publisher account exists, redirecting to dashboard...');
          router.push('/publishers/dashboard');
          // Keep checkingAccount true to prevent form flash
          return;
        }
      } catch (error) {
        // Publisher doesn't exist - that's fine, show registration form
        console.log('No existing publisher account found');
      }
      
      setCheckingAccount(false);
    }

    checkExistingPublisher();
  }, [isConnected, address, mounted, router, signMessageAsync]);

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

  // Prefetch verification token when user enters website URL and is authenticated
  useEffect(() => {
    async function prefetchVerificationData() {
      // Only prefetch if:
      // 1. User is connected
      // 2. Website URL is provided and looks valid (starts with http)
      // 3. Not already prefetching
      if (
        !isConnected ||
        !address ||
        !formData.website_url ||
        prefetchingToken
      ) {
        return;
      }

      // Simple URL validation check (starts with http/https)
      if (
        !formData.website_url.startsWith("http://") &&
        !formData.website_url.startsWith("https://")
      ) {
        return;
      }

      const token = getAuthToken();
      if (!token) {
        // Try to authenticate silently
        try {
          await authenticateWithWallet(address, signMessageAsync as any);
        } catch {
          // If auth fails, user will need to submit form
          return;
        }
      }

      const authToken = getAuthToken();
      if (!authToken) return;

      // Check if publisher exists and prefetch token
      try {
        setPrefetchingToken(true);
        const publisherResult = await api.getPublisher(authToken);

        if (publisherResult.publisher?.id) {
          // Publisher exists, check if they have domains
          const domains = publisherResult.publisher.domains || [];
          if (domains.length > 0) {
            // Prefetch token for the first domain (or most recent)
            const domain = domains[domains.length - 1];
            try {
              const tokenResult = await api.getDomainVerificationToken(
                publisherResult.publisher.id,
                domain.id,
                authToken
              );

              // Cache it with domain-specific key
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  `verification_token_${publisherResult.publisher.id}_${domain.id}`,
                  tokenResult.verification_token
                );
              }
            } catch (err) {
              // Silently fail
            }
          }
        }
      } catch (error) {
        // Publisher doesn't exist yet or other error - that's fine
        // We'll handle it on form submit
      } finally {
        setPrefetchingToken(false);
      }
    }

    // Debounce the prefetch check
    const timeoutId = setTimeout(() => {
      prefetchVerificationData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.website_url,
    isConnected,
    address,
    signMessageAsync,
    prefetchingToken,
  ]);

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

      // Get the newly added domain (last one in the array)
      const domains = result.publisher.domains || [];
      const newDomain = domains[domains.length - 1];

      if (newDomain) {
        // Pre-fetch verification token for the new domain
        api
          .getDomainVerificationToken(result.publisher.id, newDomain.id, token)
          .then((tokenResult) => {
            // Cache it with domain-specific key
            if (typeof window !== "undefined") {
              sessionStorage.setItem(
                `verification_token_${result.publisher.id}_${newDomain.id}`,
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
      }

      // Auto-redirect to verification page immediately (no delay)
      router.push("/publishers/verify");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";

      // Handle existing publisher - domain will be added automatically
      // The backend now handles this, so if we get here with a 409, it means domain already exists
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("409")
      ) {
        // Check if it's a domain conflict
        if (errorMessage.includes("Domain already exists")) {
          // Domain already registered - just take them to dashboard
          console.log("Domain already registered, redirecting to dashboard");
          router.push("/publishers/dashboard");
          return;
        }
        
        // If publisher exists, the backend should have added the domain
        // But if we get here, something went wrong - show error
        setError("Domain could not be added. Please try again.");
        setLoading(false);
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-frosted-dark pt-24">
      <div className="w-full max-w-4xl mx-auto">
        <GlassCard variant="dark" blur="xl" className="p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 scroll-mt-24 leading-tight">
            Earn more from your website.
          </h1>
          <p className="text-base md:text-lg text-white/70 mb-10 leading-relaxed">
            Keep 85% of ad revenue. Get paid instantly. No middlemen.
          </p>

          {/* Desktop: Two-column layout, Mobile: Stacked */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* How It Works */}
            <section
              className="p-6 md:p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl"
              aria-labelledby="how-it-works-heading"
            >
              <h2
                id="how-it-works-heading"
                className="text-xl md:text-2xl font-semibold text-white mb-6"
              >
                How It Works
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2
                      className="w-6 h-6 text-green-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">
                      Add your website
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Connect your wallet and share your website URL. That's it.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2
                      className="w-6 h-6 text-green-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">
                      Verify ownership
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Prove you own your site. Takes seconds. Ensures quality
                      for everyone.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center">
                    <CheckCircle2
                      className="w-6 h-6 text-green-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-2 text-base">
                      Start earning
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Ads appear automatically. Money arrives instantly. No
                      waiting, no delays.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Why Publish Card */}
            <section
              className="p-6 md:p-8 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl"
              aria-labelledby="why-publish-heading"
            >
              <h2
                id="why-publish-heading"
                className="text-xl md:text-2xl font-semibold text-white mb-4"
              >
                Why publish with us?
              </h2>
              <p className="text-white/80 text-sm md:text-base leading-relaxed">
                You keep 85% of every dollar. Traditional networks take 60–70%.
                Payments arrive instantly, not in 30 days. Every transaction is
                verified and transparent. No hidden fees. No middlemen. Just
                you, your audience, and better earnings.
              </p>
            </section>
          </div>

          {!mounted ? (
            // Show loading state during hydration to prevent mismatch
            <div className="mb-8">
              <div className="h-14 bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl animate-pulse"></div>
            </div>
          ) : !isConnected ? (
            <div className="mb-8">
              <p className="text-white/80 mb-4">
                Connect your wallet to get started:
              </p>
              <WalletConnect />
            </div>
          ) : checkingAccount ? (
            // Show loading while checking for existing publisher account
            <div className="mb-8 flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-white/60">Checking your account...</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 max-w-2xl mx-auto"
              aria-label="Publisher registration form"
            >
              {/* Step 1: Email - Always visible */}
              <div className="relative animate-in fade-in duration-300">
                <Label
                  htmlFor="email"
                  className="text-white font-medium mb-3 block text-base"
                >
                  Email{" "}
                  <span
                    className="text-white/60 font-normal"
                    aria-label="required"
                  >
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
                    className="text-white font-medium mb-3 block text-base"
                  >
                    Website URL{" "}
                    <span
                      className="text-white/60 font-normal"
                      aria-label="required"
                    >
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
                    <p
                      className="mt-2 text-sm text-red-400 font-medium"
                      role="alert"
                      aria-live="polite"
                    >
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
                    className="text-white font-medium mb-3 block text-base"
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
                    <p
                      className="mt-2 text-sm text-red-400 font-medium"
                      role="alert"
                      aria-live="polite"
                    >
                      {validationErrors.payment_wallet}
                    </p>
                  )}
                  <p
                    id="payment_wallet-help"
                    className="mt-2 text-sm text-white/70"
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
              className="text-lg md:text-xl font-semibold mb-5 text-white"
            >
              Benefits of Publishing with Buzzer Network
            </h2>
            <ul
              className="space-y-3 text-white/80 text-sm md:text-base leading-relaxed"
              role="list"
            >
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  Earn 85% of revenue. Traditional networks keep 60–70%.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  Get paid instantly. No 30-day waits. Money arrives when you
                  earn it.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  See every transaction. All payments are verified and
                  transparent.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  Connect with quality advertisers. We verify every publisher
                  and advertiser.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  Protect against fraud. Every impression is verified, so you
                  only get real traffic.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="text-green-400 font-semibold mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>
                  No middlemen. Direct relationships mean more money stays with
                  you.
                </span>
              </li>
            </ul>
          </section>
        </GlassCard>
      </div>
    </div>
  );
}
