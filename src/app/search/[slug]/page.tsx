import ClientPage from "./client-page";

// Static export: Next.js needs at least one known slug to emit the page shell.
// `dummy` is that shell — Cloudflare's _redirects serves it for every
// /search/* URL, and the client resolves the real thread from localStorage.
export function generateStaticParams() {
  return [{ slug: "dummy" }];
}

export default function Page() {
  return <ClientPage />;
}
