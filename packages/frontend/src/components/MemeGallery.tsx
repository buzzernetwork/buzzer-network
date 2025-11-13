"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Meme {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  imageUrl: string;
  sourceUrl?: string;
  isPublic?: boolean; // If true, imageUrl is a public path
}

// Pinterest images from public folder
const pinterestMemes: Meme[] = [
  {
    id: "pinterest-2",
    title: "Ad Creative Design",
    category: "advertising",
    imageUrl: "/memes/39dd3e9e61b850b619d37837eb6f76f6.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-3",
    title: "Marketing Creative",
    category: "advertising",
    imageUrl: "/memes/d458558f34e6d1cc04587a8190a635cf.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-4",
    title: "Brand Advertisement",
    category: "advertising",
    imageUrl: "/memes/f05b3989614fa591313f7e4a83ea111e.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-5",
    title: "Creative Marketing",
    category: "advertising",
    imageUrl: "/memes/5f42d1530f48dba92e8fbafbcc92626c.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-6",
    title: "Ad Design Inspiration",
    category: "advertising",
    imageUrl: "/memes/baf035ab84a13b53bf6e46662fb4b610.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-7",
    title: "Creative Advertisement",
    category: "advertising",
    imageUrl: "/memes/4d9035ee7bb30f8c274a3fa171504481.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-8",
    title: "Marketing Ad Creative",
    category: "advertising",
    imageUrl: "/memes/4c0c4c133ce344d98dcf5b87566416d2.jpg",
    isPublic: true,
  },
  {
    id: "pinterest-9",
    title: "Brand Creative",
    category: "advertising",
    imageUrl: "/memes/869188e28c63c5fd27816744bf84d2c4.jpg",
    isPublic: true,
  },
];

export function MemeGallery() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use only static Pinterest memes (no API calls)
    setMemes(pinterestMemes);
    setLoading(false);
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
                  meme.isPublic || meme.imageUrl.startsWith("/memes/") ? (
                    <Image
                      src={meme.imageUrl}
                      alt={meme.title || meme.description || "Ad creative"}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${meme.imageUrl}`}
                      alt={meme.title || meme.description || "Ad creative"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )
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

