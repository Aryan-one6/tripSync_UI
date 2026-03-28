"use client";

import { useCallback, useState, useRef } from "react";
import { ImagePlus, X, Upload, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  accept?: string;
}

function readImageAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  max = 5,
  label = "Upload images",
  accept = "image/*",
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const remaining = max - value.length;
      if (remaining <= 0) return;

      const filesToProcess = Array.from(files).slice(0, remaining);
      setIsProcessing(true);
      const newUrls = (await Promise.all(filesToProcess.map(readImageAsDataUrl))).filter(
        (url): url is string => Boolean(url),
      );
      setIsProcessing(false);

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
      }
    },
    [value, onChange, max],
  );

  const removeImage = (index: number) => {
    const updated = [...value];
    const removed = updated.splice(index, 1);
    removed.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-[var(--color-ink-700)]">{label}</p>
      )}

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={url}
              className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-white/60 shadow-[var(--shadow-clay-sm)] transition-all hover:shadow-[var(--shadow-clay)]"
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink-700)] opacity-0 shadow-[var(--shadow-clay-sm)] transition-all group-hover:opacity-100 hover:bg-[var(--color-sunset-50)] hover:text-[var(--color-sunset-600)]"
              >
                <X className="size-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-white/80 text-[var(--color-ink-500)] opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="size-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {value.length < max && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-6 sm:p-8 transition-all duration-300",
            dragOver
              ? "border-[var(--color-sea-400)] bg-[var(--color-sea-50)] shadow-[var(--shadow-clay-inset)]"
              : "border-[var(--color-ink-300)] bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)] hover:border-[var(--color-sea-300)] hover:bg-[var(--color-sea-50)]/30",
          )}
        >
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full transition-all",
              dragOver
                ? "bg-[var(--color-sea-100)] text-[var(--color-sea-600)] shadow-[var(--shadow-clay)]"
                : "bg-[var(--color-surface-raised)] text-[var(--color-ink-400)] shadow-[var(--shadow-clay-sm)]",
            )}
          >
            {dragOver ? <Upload className="size-5" /> : <ImagePlus className="size-5" />}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--color-ink-700)]">
              {isProcessing ? "Processing images..." : dragOver ? "Drop images here" : "Click or drag images"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-500)]">
              {value.length}/{max} images · JPG, PNG, WebP
            </p>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* Single cover image upload variant */
export function CoverImageUpload({
  value,
  onChange,
  label = "Cover image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsProcessing(true);
    const nextValue = await readImageAsDataUrl(file);
    setIsProcessing(false);
    if (!nextValue) return;
    if (value.startsWith("blob:")) URL.revokeObjectURL(value);
    onChange(nextValue);
  };

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-[var(--color-ink-700)]">{label}</p>
      )}

      {value ? (
        <div className="group relative aspect-[21/9] overflow-hidden rounded-[var(--radius-lg)] border border-white/60 shadow-[var(--shadow-clay)]">
          <img src={value} alt="Cover" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[var(--color-ink-900)] shadow-[var(--shadow-clay-sm)]"
              >
                <Upload className="size-4" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  if (value.startsWith("blob:")) URL.revokeObjectURL(value);
                  onChange("");
                }}
                className="flex size-9 items-center justify-center rounded-full bg-white/90 text-[var(--color-sunset-600)] shadow-[var(--shadow-clay-sm)]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-ink-300)] bg-[var(--color-surface-2)] p-8 shadow-[var(--shadow-clay-inset)] transition-all hover:border-[var(--color-sea-300)] hover:bg-[var(--color-sea-50)]/30"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-ink-400)] shadow-[var(--shadow-clay-sm)]">
            <ImagePlus className="size-6" />
          </div>
          <p className="text-sm font-medium text-[var(--color-ink-600)]">
            {isProcessing ? "Processing image..." : "Add a cover image"}
          </p>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
