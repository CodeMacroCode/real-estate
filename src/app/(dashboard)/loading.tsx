import { PageLoader } from "@/components/ui/PageLoader";

export default function DashboardLoading() {
  return (
    <PageLoader
      message="Loading Dashboard…"
      subMessage="Loading your real estate workspace"
    />
  );
}
