"use client";

import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";
import { MemeGallery } from "@/components/MemeGallery";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingDown, Target } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-black to-purple-950/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-normal tracking-tight mb-6">
              <span className="italic">Ads that drive;</span> brands thrive
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto font-light animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            X402-based Decentralized Ad Network on BASE Blockchain
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Button
              asChild
              size="lg"
              variant="glass"
              className="text-lg px-8 py-6 rounded-2xl"
            >
              <Link href="/publishers" className="flex items-center gap-2">
                For Publishers
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-2xl border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Link href="/advertisers" className="flex items-center gap-2">
                For Advertisers
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>

          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
            <WalletConnect />
          </div>
        </div>
      </section>

      {/* Meme Gallery Section */}
      <MemeGallery />

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-dark rounded-[32px] p-8 hover:scale-[1.02] transition-all duration-300">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">
                  Crypto-Native Payments
                </h3>
                <p className="text-white/60 leading-relaxed">
                  Instant payments using X402 protocol on BASE blockchain. No
                  intermediaries, no delays.
                </p>
              </div>
            </div>

            <div className="glass-dark rounded-[32px] p-8 hover:scale-[1.02] transition-all duration-300">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">
                  Lower Fees
                </h3>
                <p className="text-white/60 leading-relaxed">
                  15% network fee vs 30-40% from traditional networks. More
                  revenue for publishers.
                </p>
              </div>
            </div>

            <div className="glass-dark rounded-[32px] p-8 hover:scale-[1.02] transition-all duration-300">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white">
                  Quality Focus
                </h3>
                <p className="text-white/60 leading-relaxed">
                  Curated publisher network for premium ad inventory. Quality
                  over quantity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative py-20 px-4 border-t border-white/10">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="font-mono uppercase text-[11px] font-semibold text-white/40 tracking-wider mb-4">
            Decentralized advertising • 60% higher engagement than traditional
            marketing
          </p>
          <p className="font-mono text-xs text-white/30">
            Connect your wallet to get started
          </p>
        </div>
      </section>
    </main>
  );
}
