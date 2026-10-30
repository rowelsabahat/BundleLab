"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers3,
  WandSparkles,
  SlidersHorizontal,
  FileText,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import { CatalogProvider } from "./catalog-provider";
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/catalog", label: "Catalog", icon: Package },
  {
    href: "/bundle-generator",
    label: "Bundle Generator",
    icon: WandSparkles,
    planned: false,
  },
  {
    href: "/bundle-editor",
    label: "Bundle Editor",
    icon: SlidersHorizontal,
    planned: false,
  },
  {
    href: "/listing-studio",
    label: "Listing Studio",
    icon: FileText,
    planned: true,
  },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = navigation.find((n) => n.href === pathname);
  return (
    <CatalogProvider>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="brand" aria-label="BundleLab overview">
            <span className="brand-mark">
              <Layers3 size={24} strokeWidth={1.6} />
            </span>
            <span>
              BundleLab<span className="brand-dot">.</span>
            </span>
          </Link>
          <div className="workspace-label">
            <span className="workspace-symbol">
              <Leaf size={18} />
            </span>
            <div>
              <strong>Botanical & Co.</strong>
              <span>Fictional merchant workspace</span>
            </div>
          </div>
          <p className="nav-label">WORKSPACE</p>
          <nav aria-label="Main navigation">
            {navigation.map(({ href, label, icon: Icon, planned }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${pathname === href ? "active" : ""}`}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{label}</span>
                {planned && (
                  <span className="nav-soon" aria-label="Planned">
                    Soon
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="small-label">A LITTLE CONTEXT</span>
            <p>
              Good products.
              <br />
              Better together.
            </p>
            <span>A considered approach to your next bundle.</span>
            <Layers3 size={50} strokeWidth={0.7} aria-hidden="true" />
          </div>
          <div className="sidebar-footer">
            <span className="avatar">BC</span>
            <div>
              <strong>Demo workspace</strong>
              <span>Local to this browser</span>
            </div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>
        </aside>
        <div className="main-shell">
          <header className="top-header">
            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-slash">/</span>
              <strong>{active?.label ?? "BundleLab"}</strong>
            </div>
            <span className="demo-badge">
              <span />
              Fictional catalog · USD
            </span>
          </header>
          <main id="main-content" tabIndex={-1} className="page-content">
            {children}
          </main>
          <footer className="page-footer">
            <span>
              BundleLab <span className="text-primary">/</span> Thoughtful
              commerce.
            </span>
            <span>Independent portfolio project · No store connected</span>
          </footer>
        </div>
      </div>
    </CatalogProvider>
  );
}
