import { Suspense } from "react";
import ClientPage from "./client-page";

// Static export: the thread view is a real page served at /search and reads
// the thread ID from the ?t= query param, so no _redirects shell trick is
// needed on Cloudflare Pages.
export default function Page() {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}
