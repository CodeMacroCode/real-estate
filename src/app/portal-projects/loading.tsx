import { PageLoader } from "@/components/ui/PageLoader";

export default function PortalProjectsLoading() {
  return (
    <PageLoader
      message="Loading Projects Portal…"
      subMessage="Fetching verified developments and master plans"
    />
  );
}
