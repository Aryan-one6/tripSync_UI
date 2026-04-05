import { PageLoader } from "@/components/ui/page-loader";

export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
      <PageLoader label="Loading page" />
    </div>
  );
}
