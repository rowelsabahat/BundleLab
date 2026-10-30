"use client";
import { useRef, useState } from "react";
import {
  Download,
  FileUp,
  CircleAlert,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { importCsv, SAMPLE_CSV, type ImportError } from "@/lib/csv";
import { useCatalog } from "../catalog-provider";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { products, importedCount, addProducts, ready, storageError } =
    useCatalog();
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [filename, setFilename] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  async function handleFile(file: File | undefined) {
    if (!file || busyRef.current) return;
    setErrors([]);
    setSuccess("");
    setFilename(file.name);
    if (file.size > 1_000_000) {
      setErrors([{ row: 0, message: "File must be 1 MB or smaller." }]);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const result = importCsv(await file.text(), products, importedCount);
      if (result.errors.length) setErrors(result.errors);
      else {
        const failure = addProducts(result.products);
        if (failure) setErrors([{ row: 0, message: failure }]);
        else
          setSuccess(
            `${result.products.length} product${result.products.length === 1 ? "" : "s"} imported and saved in this browser.`,
          );
      }
    } catch {
      setErrors([
        {
          row: 0,
          message:
            "The file could not be read. Choose a UTF-8 CSV file and try again.",
        },
      ]);
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      title="Bring your products along"
      description="Import a CSV to add products to this workspace. Your 24 sample products stay in place."
    >
      <div className="import-help">
        <span className="step-number">1</span>
        <div>
          <strong>Start with the template</strong>
          <p>
            Use USD amounts such as 24.00, whole-number stock, and skincare or
            wellness categories. Separate tags with |.
          </p>
          <a
            className="text-link"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
            download="bundlelab-products-template.csv"
          >
            <Download size={15} />
            Download sample CSV
          </a>
        </div>
      </div>
      <div className="import-help">
        <span className="step-number">2</span>
        <div>
          <strong>Choose your CSV</strong>
          <p>
            Up to 1 MB and 500 imported products total. IDs must be unique.
            Existing products are never overwritten. If any row is invalid,
            nothing is added.
          </p>
        </div>
      </div>
      <label className={`upload-zone ${busy ? "is-busy" : ""}`}>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          aria-label="Choose product CSV"
          disabled={busy || !ready || !!storageError}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <FileUp size={28} strokeWidth={1.4} />
        <strong>
          {busy ? "Validating your catalog…" : "Choose a CSV file"}
        </strong>
        <span>{filename || "UTF-8 CSV · 1 MB maximum"}</span>
      </label>
      {busy && (
        <p role="status" className="feedback">
          <LoaderCircle className="animate-spin" size={16} />
          Reading and validating product rows…
        </p>
      )}
      {success && (
        <div role="status" className="feedback success">
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}
      {!!errors.length && (
        <div role="alert" className="import-errors">
          <strong className="flex items-center gap-2">
            <CircleAlert size={18} />
            Import not saved · {errors.length} issue
            {errors.length === 1 ? "" : "s"}
          </strong>
          <ul>
            {errors.slice(0, 30).map((error, i) => (
              <li key={i}>
                {error.row > 0 && <b>Row {error.row}: </b>}
                {error.message}
              </li>
            ))}
          </ul>
          {errors.length > 30 && (
            <p>Showing the first 30 issues. Correct these and import again.</p>
          )}
        </div>
      )}
      {storageError && (
        <p role="alert" className="feedback error">
          {storageError}
        </p>
      )}
      <p className="assumption">
        Stored only in this browser. Clearing browser data removes imports. No
        files are uploaded to a server.
      </p>
      <div className="modal-actions">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          {success ? "Back to catalog" : "Close"}
        </Button>
      </div>
    </Modal>
  );
}
