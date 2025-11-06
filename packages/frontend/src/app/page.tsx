import InfiniteGallery from "@/components/InfiniteGallery";
import { LandingNavigation } from "@/components/LandingNavigation";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Globe, Megaphone, TrendingUp, Shield, Zap, DollarSign } from "lucide-react";

export default function Home() {
  const sampleImages = [
    {
      src: "/memes/39dd3e9e61b850b619d37837eb6f76f6.jpg",
      alt: "Ad Creative Design",
    },
    {
      src: "/memes/d458558f34e6d1cc04587a8190a635cf.jpg",
      alt: "Marketing Creative",
    },
    {
      src: "/memes/f05b3989614fa591313f7e4a83ea111e.jpg",
      alt: "Brand Advertisement",
    },
    {
      src: "/memes/5f42d1530f48dba92e8fbafbcc92626c.jpg",
      alt: "Creative Marketing",
    },
    {
      src: "/memes/baf035ab84a13b53bf6e46662fb4b610.jpg",
      alt: "Ad Design Inspiration",
    },
    {
      src: "/memes/4d9035ee7bb30f8c274a3fa171504481.jpg",
      alt: "Creative Advertisement",
    },
    {
      src: "/memes/4c0c4c133ce344d98dcf5b87566416d2.jpg",
      alt: "Marketing Ad Creative",
    },
    {
      src: "/memes/869188e28c63c5fd27816744bf84d2c4.jpg",
      alt: "Brand Creative",
    },
    {
      src: "/memes/scraped_65a15fd8127949ff_1762282801970.webp",
      alt: "Scraped Ad Creative",
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Full-screen gallery */}
      <div className="h-screen w-full relative">
        <InfiniteGallery
          images={sampleImages}
          speed={1.2}
          zSpacing={3}
          visibleCount={12}
          falloff={{ near: 0.8, far: 14 }}
          className="h-full w-full rounded-lg overflow-hidden"
        />
        
        {/* Navigation Overlay */}
        <LandingNavigation />

        {/* Scroll Indicator */}
        <ScrollIndicator />

        {/* Hero Text with Value Proposition */}
        <div className="h-full inset-0 pointer-events-none fixed flex items-center justify-center text-center px-3 text-white z-30">
          <div className="relative">
            {/* Background overlay for readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl -z-10 -m-8"></div>
            <h1 className="font-serif text-4xl md:text-7xl tracking-tight relative drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              <span className="italic">Ads that drive;</span> brands thrive
            </h1>
          </div>
        </div>

        {/* Bottom instruction text - moved up to make room for CTAs */}
        <div className="text-center fixed bottom-32 left-0 right-0 font-mono uppercase text-sm font-semibold pointer-events-none z-30">
          <p className="text-white/80">
            Use mouse wheel, arrow keys, or touch to navigate
          </p>
        </div>
      </div>

      {/* Scroll Section Below Gallery */}
      <section className="min-h-screen bg-frosted-dark py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* How It Works */}
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
              How It Works
            </h2>
            <p className="text-xl text-white/60 text-center mb-12 max-w-2xl mx-auto">
              Three simple steps to connect advertisers with premium publishers
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <GlassCard variant="dark" blur="xl" className="p-8 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Publishers</h3>
                <p className="text-white/80 mb-6">
                  Register your website, verify domain ownership, and start earning with premium ads
                </p>
                <Link href="/publishers">
                  <Button variant="glass-dark" size="lg" className="w-full">
                    Start Publishing
                  </Button>
                </Link>
              </GlassCard>

              <GlassCard variant="dark" blur="xl" className="p-8 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Megaphone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Advertisers</h3>
                <p className="text-white/80 mb-6">
                  Create campaigns, set targeting, fund with crypto, and reach quality audiences
                </p>
                <Link href="/advertisers">
                  <Button variant="glass-dark" size="lg" className="w-full">
                    Launch Campaign
                  </Button>
                </Link>
              </GlassCard>

              <GlassCard variant="dark" blur="xl" className="p-8 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Network</h3>
                <p className="text-white/80 mb-6">
                  Our matching engine connects the right ads with the right publishers automatically
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
              Why Buzzer Network?
            </h2>
            <p className="text-xl text-white/60 text-center mb-12 max-w-2xl mx-auto">
              Built for the decentralized web with transparency and fairness at its core
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <GlassCard variant="dark" blur="xl" className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-green-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Better Revenue Share</h3>
                    <p className="text-white/80">
                      Publishers earn 85% of ad revenue (vs 30-40% from traditional networks). 
                      Advertisers pay only 15% fees (vs 30-40% elsewhere).
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard variant="dark" blur="xl" className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Instant Payments</h3>
                    <p className="text-white/80">
                      No net-30 delays. Publishers receive crypto payments directly to their wallet 
                      with transparent on-chain records.
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard variant="dark" blur="xl" className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Transparent & Trustless</h3>
                    <p className="text-white/80">
                      All transactions are recorded on BASE blockchain. Smart contracts ensure 
                      fair distribution without intermediaries.
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard variant="dark" blur="xl" className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Quality Focused</h3>
                    <p className="text-white/80">
                      Domain verification ensures quality publishers. Advanced targeting and 
                      matching engine delivers better results.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Final CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/publishers">
                <Button
                  variant="glass-dark"
                  size="lg"
                  className="min-w-[240px] h-14 text-base font-semibold"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Start Publishing
                </Button>
              </Link>
              <Link href="/advertisers">
                <Button
                  variant="glass-dark"
                  size="lg"
                  className="min-w-[240px] h-14 text-base font-semibold"
                >
                  <Megaphone className="w-5 h-5 mr-2" />
                  Launch Campaign
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
