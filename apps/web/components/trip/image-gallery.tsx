"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Images as ImagesIcon } from "lucide-react";
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
      <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-lg">
        <div className="text-center">
          <ImagesIcon className="mx-auto size-12 text-[var(--color-sea-300)]" />
          <p className="mt-3 text-sm font-medium text-[var(--color-ink-500)]">No photos yet</p>
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

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const sideImages = images.slice(1, 5);

  const tileSpanClass = (count: number, index: number) => {
    if (count === 1) return "col-span-2 row-span-2";
    if (count === 2) return "row-span-2";
    if (count === 3 && index === 0) return "row-span-2";
    return "";
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/40 bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay-sm)]">
        <div className="grid gap-2 p-2 md:grid-cols-[1.6fr_1fr] md:p-2.5">
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="group relative block overflow-hidden rounded-xl md:h-[420px]"
          >
            <img
              src={images[0]}
              alt={`${title} - 1`}
              className="aspect-[16/10] size-full object-cover transition-transform duration-500 group-hover:scale-105 md:aspect-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                <ImagesIcon className="size-3.5" />
                <span>{images.length} photos</span>
              </div>
            )}
          </button>

          {sideImages.length > 0 && (
            <div className="hidden h-[420px] grid-cols-2 grid-rows-2 gap-2 md:grid">
              {sideImages.map((url, i) => {
                const imageIndex = i + 1;
                const isLastVisible = i === sideImages.length - 1;
                const extraCount = Math.max(0, images.length - 5);

                return (
                  <button
                    key={`${url}-${imageIndex}`}
                    type="button"
                    onClick={() => openLightbox(imageIndex)}
                    className={cn(
                      "group relative overflow-hidden rounded-lg",
                      tileSpanClass(sideImages.length, i),
                    )}
                  >
                    <img
                      src={url}
                      alt={`${title} - ${imageIndex + 1}`}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-75" />
                    {isLastVisible && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-md bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        <span>View all photos</span>
                        {extraCount > 0 && <span>+{extraCount}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-2 pb-2 md:hidden">
            {images.slice(1, Math.min(images.length, 6)).map((url, i) => (
              <button
                key={`${url}-${i + 1}`}
                type="button"
                onClick={() => openLightbox(i + 1)}
                className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md"
              >
                <img
                  src={url}
                  alt={`${title} - ${i + 2}`}
                  className="size-full object-cover"
                />
              </button>
            ))}
            {images.length > 6 && (
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-xs font-semibold text-[var(--color-sea-700)]"
              >
                +{images.length - 6} more
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-label="Image gallery lightbox"
        >
          <div
            className="relative w-full max-h-[90vh] flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main image */}
            <div className="relative max-w-4xl">
              <img
                src={images[selectedIndex]}
                alt={`${title} - ${selectedIndex + 1}`}
                className="max-h-[80vh] rounded-xl object-contain shadow-2xl"
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("prev")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("next")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                    aria-label="Next image"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>

            {/* Counter and info */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <p className="text-sm font-medium text-white">
                {selectedIndex + 1} <span className="text-white/60">/ {images.length}</span>
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-6 right-6 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              aria-label="Close gallery"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
