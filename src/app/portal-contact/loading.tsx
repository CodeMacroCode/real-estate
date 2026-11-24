import { PageLoader } from "@/components/ui/PageLoader";

export default function PortalContactLoading() {
  return (
    <PageLoader
      message="Loading Contact…"
      subMessage="Connecting to verified agency profile"
    />
  );
}
