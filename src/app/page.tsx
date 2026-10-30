import { Layers3 } from "lucide-react";
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center gap-3 border-b pb-6">
        <Layers3 aria-hidden="true" className="size-7 text-primary" />
        <span className="text-xl font-semibold tracking-tight">BundleLab</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Portfolio prototype
        </span>
      </header>
      <section className="flex flex-1 flex-col justify-center py-20">
        <p className="mb-6 text-sm font-medium text-primary">
          Foundation ready
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Thoughtful bundles. Clearer decisions.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A workspace for small merchants to explore complementary products,
          understand bundle profitability, and prepare marketing-ready listings.
        </p>
        <p className="mt-10 max-w-xl rounded-lg border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          Project setup is complete. The catalog, bundle builder, saved bundles,
          and AI assistance are planned for upcoming implementation steps.
        </p>
      </section>
      <footer className="border-t pt-6 text-xs text-muted-foreground">
        Independent concept project. No Shopify affiliation or store connection.
      </footer>
    </main>
  );
}
