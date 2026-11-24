import { PageLoader } from "@/components/ui/PageLoader";

export default function AuthLoading() {
  return (
    <PageLoader
      message="Loading Authentication…"
      subMessage="Redirecting to secure login"
    />
  );
}
