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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

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

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const point = event.changedTouches[0];
    if (!point) return;
    setTouchStartX(point.clientX);
    setTouchEndX(null);
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const point = event.changedTouches[0];
    if (!point) return;
    setTouchEndX(point.clientX);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const deltaX = touchStartX - touchEndX;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX > 0) navigate("next");
    else navigate("prev");
  };

  const sideImages = images.slice(1, 5);
  const sideCount = sideImages.length;

  const sideGridClass =
    sideCount === 1
      ? "grid grid-cols-1"
      : sideCount === 2
        ? "grid grid-cols-1 grid-rows-2"
        : "grid grid-cols-2 grid-rows-2";

  const sideTileClass = (index: number) => {
    if (sideCount === 3 && index === 0) return "row-span-2";
    return "";
  };

  return (
    <>
      <div className="overflow-hidden rounded-3xl bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay-sm)]">
        {/* Mobile carousel */}
        <div
          className="relative p-2 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => openLightbox(selectedIndex)}
            className="group relative block w-full overflow-hidden rounded-2xl"
          >
            <img
              src={images[selectedIndex]}
              alt={`${title} - ${selectedIndex + 1}`}
              className="aspect-[16/10] size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-90" />
            <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {selectedIndex + 1}/{images.length}
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <ImagesIcon className="size-3.5" />
              <span>{images.length} photos</span>
            </div>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate("prev")}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("next")}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
                aria-label="Next image"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="mt-2 flex justify-center gap-1.5 px-2 pb-1">
                {images.map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selectedIndex ? "w-5 bg-[var(--color-sea-700)]" : "w-1.5 bg-[var(--color-ink-300)]",
                    )}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop collage */}
        <div className="hidden gap-2 p-2 md:grid md:grid-cols-[2fr_1fr] md:gap-3 md:p-3">
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="group relative block overflow-hidden rounded-2xl md:h-[520px]"
          >
            <img
              src={images[0]}
              alt={`${title} - 1`}
              className="aspect-[16/10] size-full object-cover transition-transform duration-500 group-hover:scale-105 md:aspect-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70" />
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                <ImagesIcon className="size-3.5" />
                <span>{images.length} photos</span>
              </div>
            )}
          </button>

          {sideCount > 0 && (
            <div className={cn("hidden h-[520px] gap-3 md:grid", sideGridClass)}>
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
                      "group relative overflow-hidden rounded-2xl",
                      sideTileClass(i),
                    )}
                  >
                    <img
                      src={url}
                      alt={`${title} - ${imageIndex + 1}`}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80" />
                    {isLastVisible && (
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-white/90 px-3 py-2 text-[11px] font-semibold text-[var(--color-ink-900)] shadow-sm backdrop-blur">
                        <span>View all images</span>
                        {extraCount > 0 && <span>+{extraCount}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
