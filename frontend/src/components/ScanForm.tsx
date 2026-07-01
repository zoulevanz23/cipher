import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { scanDependencies } from "../api/client";
import type { ScanResponse } from "../types";

interface ScanFormProps {
  onResult: (res: ScanResponse | null) => void;
  onLoading: (v: boolean) => void;
  onError: (err: string | null) => void;
  hasResult?: boolean;
}

export function ScanForm({ onResult, onLoading, onError, hasResult }: ScanFormProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [lockType, setLockType] = useState("package-lock.json");
  const [tab, setTab] = useState<"paste" | "upload" | "example">("paste");
  const [loadedFile, setLoadedFile] = useState<string | null>(null);

  const loadFile = useCallback((file: File) => {
    if (file.name.endsWith(".lock")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setLockInput(text);
        setLockType(file.name);
        setLoadedFile(file.name);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setJsonInput(text);
        setLoadedFile(file.name);
        setTab("paste");
      };
      reader.readAsText(file);
    } else {
      onError("Unsupported file type. Please upload a package.json or lock file.");
    }
  }, [onError]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    loadFile(file);
  }, [loadFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: undefined,
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  const handleScan = async () => {
    const content = tab === "example" ? EXAMPLE_PACKAGE_JSON : jsonInput;
    if (!content.trim()) {
      onError("Please provide a package.json content");
      return;
    }

    onError(null);
    onLoading(true);

    try {
      const result = await scanDependencies({
        package_json: content,
        lock_file: lockInput || undefined,
        lock_file_type: lockType,
      });
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      onLoading(false);
    }
  };

  const handleReset = () => {
    setJsonInput("");
    setLockInput("");
    setLoadedFile(null);
    onResult(null);
    onError(null);
  };

  const hasContent = jsonInput.trim() || tab === "example";

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          <span className="text-gray-400 font-mono text-sm mr-1">$</span>
          Scan Dependencies
        </h2>
        {hasResult && (
          <button onClick={handleReset} className="text-sm text-gray-400 hover:text-white transition-colors">
            &larr; New scan
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-surface-2 mb-6">
        {(["paste", "upload", "example"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-accent text-white shadow-lg shadow-accent/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "paste" ? "Paste JSON" : t === "upload" ? "Upload File" : "Try Example"}
          </button>
        ))}
      </div>

      {tab === "paste" && (
        <div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your package.json content here..."
            className="w-full h-48 p-4 rounded-xl bg-surface-2 border border-border text-sm font-mono text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-all"
            spellCheck={false}
          />
          {loadedFile && (
            <div className="mt-2 flex items-center gap-2 text-xs text-accent font-mono">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              loaded: {loadedFile}
            </div>
          )}
        </div>
      )}

      {tab === "upload" && (
        <div {...getRootProps()} className="w-full">
          <input {...getInputProps()} />
          <div
            onClick={open}
            className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragActive
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50 hover:bg-surface-2"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">
                {isDragActive ? "Drop file here" : "Drag & drop or click to browse"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Supports package.json, package-lock.json, yarn.lock</p>
            </div>
          </div>
          {loadedFile && (
            <div className="mt-3 flex items-center gap-2 text-xs text-accent font-mono">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              loaded: {loadedFile}
              <button
                onClick={() => setTab("paste")}
                className="ml-auto px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
              >
                view &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "example" && (
        <div className="w-full h-48 p-4 rounded-xl bg-surface-2 border border-border overflow-auto">
          <pre className="text-xs font-mono text-gray-400 leading-relaxed">{EXAMPLE_PACKAGE_JSON}</pre>
        </div>
      )}

      <button
        onClick={handleScan}
        disabled={!hasContent}
        className="mt-6 w-full py-3.5 rounded-xl font-semibold text-white scan-gradient transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
      >
        <span className="text-gray-400 font-mono text-xs mr-2">&gt;</span>
        EXECUTE VULNERABILITY SCAN
      </button>
    </div>
  );
}

const EXAMPLE_PACKAGE_JSON = JSON.stringify(
  {
    name: "example-app",
    version: "1.0.0",
    dependencies: {
      react: "^18.2.0",
      lodash: "^4.17.20",
      axios: "^0.21.0",
      express: "^4.17.1",
      "jsonwebtoken": "^8.5.1",
    },
    devDependencies: {
      typescript: "^4.5.0",
      webpack: "^5.0.0",
    },
  },
  null,
  2
);
