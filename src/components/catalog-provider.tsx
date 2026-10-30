"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { seedProducts } from "@/lib/catalog";
import {
  CATALOG_STORAGE_KEY,
  decodeImportedCatalog,
  encodeImportedCatalog,
} from "@/lib/storage";
import { productListSchema, type Product } from "@/lib/schemas";

type CatalogContextValue = {
  products: Product[];
  importedCount: number;
  ready: boolean;
  storageError: string;
  addProducts: (products: Product[]) => string | null;
  clearImports: () => string | null;
};
const CatalogContext = createContext<CatalogContextValue | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [imported, setImported] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    // Hydrate external browser storage only after mount; SSR always renders the seed catalog.
    try {
      const restored = decodeImportedCatalog(
        localStorage.getItem(CATALOG_STORAGE_KEY),
        seedProducts,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing external persistent storage after hydration.
      setImported(restored);
    } catch {
      setStorageError(
        "Saved imports could not be loaded. The sample catalog is available. Clear saved imports to recover, or allow browser storage.",
      );
    }
    setReady(true);
  }, []);
  const products = [...seedProducts, ...imported];
  function addProducts(incoming: Product[]) {
    try {
      if (!ready || storageError)
        return "Resolve the saved catalog warning before importing.";
      productListSchema.parse([...products, ...incoming]);
      const next = [...imported, ...incoming];
      localStorage.setItem(CATALOG_STORAGE_KEY, encodeImportedCatalog(next));
      setImported(next);
      return null;
    } catch {
      return "Import was not saved. Browser storage may be blocked or full. No products were added.";
    }
  }
  function clearImports() {
    try {
      localStorage.removeItem(CATALOG_STORAGE_KEY);
      setImported([]);
      setStorageError("");
      return null;
    } catch {
      return "Cannot clear saved imports. Allow browser storage and try again.";
    }
  }
  return (
    <CatalogContext.Provider
      value={{
        products,
        importedCount: imported.length,
        ready,
        storageError,
        addProducts,
        clearImports,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("CatalogProvider is required.");
  return value;
}
