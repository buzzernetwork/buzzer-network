"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Meme {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  imageUrl: string;
  sourceUrl?: string;
}

export function MemeGallery() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMemes() {
      try {
        const result = await api.getMemeGallery();
        if (result.success && result.memes) {
          setMemes(result.memes);
        }
      } catch (error) {
        console.error("Failed to load memes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadMemes();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">Loading creative ads...</p>
      </div>
    );
  }

  if (memes.length === 0) {
    return null;
  }

  return (
    <section className="relative py-32 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif mb-4 text-white">
            Creative Ads Collection
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Scroll-stopping ads from top brands, curated for inspiration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memes.map((meme) => (
            <a
              key={meme.id}
              href={meme.sourceUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group glass-dark rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300"
            >
              <div className="relative aspect-video bg-white/5 overflow-hidden">
                {meme.imageUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${meme.imageUrl}`}
                    alt={meme.title || meme.description || "Ad creative"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    No image
                  </div>
                )}
              </div>
              {(meme.title || meme.description) && (
                <div className="p-4">
                  {meme.title && (
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">
                      {meme.title}
                    </h3>
                  )}
                  {meme.description && (
                    <p className="text-white/60 text-sm line-clamp-2">
                      {meme.description}
                    </p>
                  )}
                  {meme.category && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-white/10 text-white/80">
                      {meme.category}
                    </span>
                  )}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

