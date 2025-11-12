import dynamic from "next/dynamic";
import { LandingNavigation } from "@/components/LandingNavigation";

// Lazy load InfiniteGallery (Three.js is heavy, ~200KB)
// This reduces initial bundle size by ~200KB
const InfiniteGallery = dynamic(
  () => import("@/components/InfiniteGallery"),
  {
    ssr: false, // Three.js requires browser APIs
    loading: () => (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white/60 text-sm">Loading gallery...</div>
        </div>
      </div>
    ),
  }
);

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

      </div>
    </main>
  );
}
