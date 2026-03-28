import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppShareButton({
  href,
  label = "Share on WhatsApp",
  size = "default",
  className,
}: {
  href: string;
  label?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      <Button
        type="button"
        variant="soft"
        size={size}
        className="gap-2 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 shadow-[var(--shadow-clay-sm)]"
      >
        <Share2 className="size-4" />
        {label}
      </Button>
    </a>
  );
}
