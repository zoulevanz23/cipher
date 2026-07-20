import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { scanDependencies } from "../api/client";
import type { ScanResponse } from "../types";

interface ScanFormProps {
  onResult: (res: ScanResponse | null, packageJsonValue?: string) => void;
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
      onResult(result, content);
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

  const tabs = [
    { id: "paste" as const, label: "Paste JSON" },
    { id: "upload" as const, label: "Upload File" },
    { id: "example" as const, label: "Try Example" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 animate-slide-up">
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-gray-600">$</span>
            <span className="text-gray-200 font-semibold">scan</span>
            <span className="text-accent">--input</span>
            <span className="text-gray-600">./package.json</span>
          </div>
        </div>
        {hasResult && (
          <button onClick={handleReset} className="text-xs font-mono text-gray-500 hover:text-accent transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-2/80">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            new scan
          </button>
        )}
      </div>

      <div className="flex gap-0.5 px-6 pt-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 text-xs font-mono font-medium transition-all ${
              tab === t.id
                ? "text-accent bg-surface-2 border border-border rounded-t-lg border-b-0 -mb-px"
                : "text-gray-500 hover:text-gray-300 border-b border-transparent"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-surface-2" />
            )}
          </button>
        ))}
        <div className="flex-1 border-b border-border" />
      </div>

      <div className="px-6 pb-5">
        {tab === "paste" && (
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-mono text-gray-600 bg-surface-2 border border-border rounded-t-lg border-b-0">
              <span>package.json</span>
              {jsonInput && (
                <span>{jsonInput.split("\n").length} lines · {jsonInput.length} chars</span>
              )}
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={'{\n  "name": "my-app",\n  "dependencies": {\n    "react": "^18.2.0",\n    "lodash": "^4.17.21"\n  }\n}'}
              className="w-full h-52 p-4 bg-[#0a0a0e] border border-border text-sm font-mono text-gray-200 placeholder-gray-700 resize-none focus:outline-none focus:border-accent/30 transition-all rounded-b-lg"
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
              className={`w-full h-52 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                isDragActive
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50 hover:bg-surface-2"
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/10">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">
                  {isDragActive ? "Drop file here" : "Drag & drop or click to browse"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-accent font-mono">package.json</span>
                  <span className="text-gray-600 mx-1.5">/</span>
                  <span className="text-accent font-mono">package-lock.json</span>
                  <span className="text-gray-600 mx-1.5">/</span>
                  <span className="text-accent font-mono">yarn.lock</span>
                </p>
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
          <div>
            <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-mono text-gray-600 bg-surface-2 border border-border rounded-t-lg border-b-0">
              <span>example-package.json</span>
              <span className="text-accent/60">sample data</span>
            </div>
            <div className="w-full h-52 p-4 bg-[#0a0a0e] border border-border rounded-b-lg overflow-auto">
              <pre className="text-xs font-mono text-gray-400 leading-relaxed">{EXAMPLE_PACKAGE_JSON}</pre>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-6 pb-6">
        <button
          onClick={handleScan}
          disabled={!hasContent}
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm font-mono scan-gradient transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          <span className="text-gray-800 font-bold">&gt;</span>
          <span className="text-gray-800 font-bold">EXECUTE VULNERABILITY SCAN</span>
        </button>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 shrink-0">
          {["npm", "pip", "go", "maven", "cargo"].map((eco) => (
            <span key={eco} className="px-1.5 py-0.5 rounded bg-surface-2 border border-border">{eco}</span>
          ))}
        </div>
      </div>
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
