import { PageLoader } from "@/components/ui/PageLoader";

export default function PortalPropertiesLoading() {
  return (
    <PageLoader
      message="Loading Properties Portal…"
      subMessage="Fetching verified listings and project specs"
    />
  );
}
