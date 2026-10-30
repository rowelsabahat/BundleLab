"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { seedProducts } from "@/lib/catalog";
import {
  CATALOG_STORAGE_KEY,
  decodeImportedCatalog,
  persistImportedCatalog,
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
  const expectedRaw = useRef<string | null>(null);
  useEffect(() => {
    // Hydrate external browser storage only after mount; SSR always renders the seed catalog.
    try {
      expectedRaw.current = localStorage.getItem(CATALOG_STORAGE_KEY);
      const restored = decodeImportedCatalog(expectedRaw.current, seedProducts);
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
      expectedRaw.current = persistImportedCatalog(
        localStorage,
        next,
        expectedRaw.current,
      );
      setImported(next);
      return null;
    } catch (failure) {
      if (failure instanceof Error && failure.message.startsWith("Another tab"))
        return failure.message;
      return "Import was not saved. Browser storage may be blocked or full. No products were added.";
    }
  }
  function clearImports() {
    try {
      expectedRaw.current = persistImportedCatalog(
        localStorage,
        null,
        expectedRaw.current,
      );
      setImported([]);
      setStorageError("");
      return null;
    } catch (failure) {
      if (failure instanceof Error && failure.message.startsWith("Another tab"))
        return failure.message;
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
