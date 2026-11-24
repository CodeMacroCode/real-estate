import { PageLoader } from "@/components/ui/PageLoader";

export default function RootLoading() {
  return (
    <PageLoader
      message="Loading…"
      subMessage="Please wait while the page loads"
    />
  );
}
