"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[2.2/1] items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-inset)]">
        <div className="text-center">
          <Images className="mx-auto size-10 text-[var(--color-sea-300)]" />
          <p className="mt-2 text-sm text-[var(--color-ink-500)]">No photos yet</p>
        </div>
      </div>
    );
  }

  const navigate = (direction: "prev" | "next") => {
    setSelectedIndex((i) =>
      direction === "next"
        ? (i + 1) % images.length
        : (i - 1 + images.length) % images.length,
    );
  };

  return (
    <>
      {/* Main gallery grid */}
      <div className="grid gap-2 sm:grid-cols-[1fr_0.4fr] sm:grid-rows-2">
        {/* Primary image */}
        <button
          type="button"
          onClick={() => {
            setSelectedIndex(0);
            setLightboxOpen(true);
          }}
          className="group relative overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-clay)] sm:row-span-2 sm:rounded-r-none"
        >
          <img
            src={images[0]}
            alt={`${title} - 1`}
            className="aspect-[16/9] size-full object-cover transition-transform duration-500 group-hover:scale-105 sm:aspect-auto sm:h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        {/* Side thumbnails — hidden on mobile, shown on sm+ */}
        {images.slice(1, 3).map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => {
              setSelectedIndex(i + 1);
              setLightboxOpen(true);
            }}
            className={cn(
              "group relative hidden overflow-hidden shadow-[var(--shadow-clay-sm)] sm:block",
              i === 0 && "sm:rounded-tr-[var(--radius-lg)]",
              i === 1 && "sm:rounded-br-[var(--radius-lg)]",
              images.length <= 1 && "sm:hidden",
            )}
          >
            <img
              src={url}
              alt={`${title} - ${i + 2}`}
              className="aspect-[1.4/1] size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* "+N more" overlay on last visible thumb */}
            {i === 1 && images.length > 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-[2px]">
                <span className="font-display text-lg">+{images.length - 3} more</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Photo count badge */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-700)] shadow-[var(--shadow-clay-sm)] transition hover:shadow-[var(--shadow-clay)]"
        >
          <Images className="size-3.5" />
          {images.length} photos
        </button>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-label="Image gallery"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedIndex]}
              alt={`${title} - ${selectedIndex + 1}`}
              className="max-h-[85vh] rounded-[var(--radius-lg)] object-contain shadow-2xl"
            />

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("prev")}
                  className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:-left-14 sm:size-10"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("next")}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:-right-14 sm:size-10"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            {/* Counter */}
            <p className="mt-3 text-center text-sm text-white/70">
              {selectedIndex + 1} / {images.length}
            </p>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  );
}
