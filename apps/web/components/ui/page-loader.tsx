"use client";

import Lottie from "lottie-react";
import loaderAnimation from "@/lib/animations/loader.json";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  className?: string;
  sizeClassName?: string;
  label?: string;
};

export function PageLoader({
  className,
  sizeClassName = "h-24 w-24 sm:h-28 sm:w-28",
  label = "Loading",
}: PageLoaderProps) {
  return (
    <div className={cn("pointer-events-none select-none", className)} role="status" aria-label={label}>
      <Lottie animationData={loaderAnimation} loop autoplay className={cn("mx-auto", sizeClassName)} />
    </div>
  );
}
