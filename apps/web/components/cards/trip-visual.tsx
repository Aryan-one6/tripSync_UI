import { cn } from "@/lib/utils";
import { Mountain, Palmtree, Sunrise, Compass } from "lucide-react";

const palettes = [
  {
    gradient: "from-[#0d9670] via-[#14b88a] to-[#5edbb5]",
    icon: Mountain,
    blob1: "bg-[rgba(255,255,255,0.2)]",
    blob2: "bg-[rgba(94,219,181,0.3)]",
  },
  {
    gradient: "from-[#e04f1a] via-[#f06830] to-[#ffa574]",
    icon: Sunrise,
    blob1: "bg-[rgba(255,255,255,0.2)]",
    blob2: "bg-[rgba(255,165,116,0.3)]",
  },
  {
    gradient: "from-[#2a5f8f] via-[#3a7cb5] to-[#7db8e0]",
    icon: Compass,
    blob1: "bg-[rgba(255,255,255,0.2)]",
    blob2: "bg-[rgba(125,184,224,0.3)]",
  },
  {
    gradient: "from-[#5a7c2f] via-[#7da33f] to-[#b5d47a]",
    icon: Palmtree,
    blob1: "bg-[rgba(255,255,255,0.2)]",
    blob2: "bg-[rgba(181,212,122,0.3)]",
  },
];

function hash(input: string) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function TripVisual({
  title,
  eyebrow,
  className,
  coverImageUrl,
}: {
  title: string;
  eyebrow: string;
  className?: string;
  coverImageUrl?: string;
}) {
  const palette = palettes[hash(title) % palettes.length];
  const Icon = palette.icon;

  if (coverImageUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]",
          className,
        )}
      >
        <img src={coverImageUrl} alt={title} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
            {eyebrow}
          </span>
          <h3 className="mt-2 max-w-[14rem] font-display text-lg leading-tight text-white sm:text-xl">
            {title}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br p-5 text-white",
        "shadow-[var(--shadow-sm)]",
        "border border-white/10",
        palette.gradient,
        className,
      )}
    >
      {/* Floating icon */}
      <div className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
        <Icon className="size-5 text-white/70" />
      </div>

      <span className="relative inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
        {eyebrow}
      </span>
      <h3 className="relative mt-8 max-w-[12rem] font-display text-lg leading-tight sm:mt-10 sm:text-xl">
        {title}
      </h3>
    </div>
  );
}
