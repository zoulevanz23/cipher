import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { scanDependencies, scanByUrl, scanStream } from "../api/client";
import type { ScanProgressEvent, ScanResponse } from "../types";

interface ScanFormProps {
  onResult: (res: ScanResponse | null, packageJsonValue?: string) => void;
  onLoading: (v: boolean) => void;
  onError: (err: string | null) => void;
  onProgress?: (ev: ScanProgressEvent) => void;
  hasResult?: boolean;
}

export function ScanForm({ onResult, onLoading, onError, onProgress, hasResult }: ScanFormProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [lockType, setLockType] = useState("package-lock.json");
  const [tab, setTab] = useState<"paste" | "upload" | "example" | "url">("paste");
  const [urlInput, setUrlInput] = useState("");
  const [includeDev, setIncludeDev] = useState(true);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadFile = useCallback((file: File) => {
    if (file.name.endsWith(".lock")) {
      const reader = new FileReader();
      reader.onload = (e) => { setLockInput(e.target?.result as string); setLockType(file.name); setLoadedFile(file.name); };
      reader.readAsText(file);
    } else if (file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => { setJsonInput(e.target?.result as string); setLoadedFile(file.name); setTab("paste"); };
      reader.readAsText(file);
    } else onError("Unsupported file type. Please upload a package.json or lock file.");
  }, [onError]);

  const onDrop = useCallback((accepted: File[]) => { const f = accepted[0]; if (f) loadFile(f); }, [loadFile]);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, accept: undefined, maxFiles: 1, noClick: true, noKeyboard: true });

  const handleScan = async () => {
    onError(null); onLoading(true); setScanning(true);
    try {
      if (tab === "url") {
        if (!/^https:\/\//i.test(urlInput.trim())) { onError("Enter an https:// URL to a manifest file"); onLoading(false); setScanning(false); return; }
        const r = await scanByUrl({ url: urlInput.trim(), include_dev: includeDev }); onResult(r); return;
      }
      const content = tab === "example" ? EXAMPLE_PACKAGE_JSON : jsonInput;
      if (!content.trim()) { onError("Please provide a package.json content"); onLoading(false); setScanning(false); return; }
      const result: ScanResponse = typeof onProgress === "function"
        ? await scanStream({ package_json: content, lock_file: lockInput || undefined, lock_file_type: lockType, include_dev: includeDev }, onProgress)
        : await scanDependencies({ package_json: content, lock_file: lockInput || undefined, lock_file_type: lockType, min_severity: "low", include_dev: includeDev });
      onResult(result, content);
    } catch (err) { onError(err instanceof Error ? err.message : "Scan failed"); } finally { onLoading(false); setScanning(false); }
  };

  const handleReset = () => { setJsonInput(""); setLockInput(""); setUrlInput(""); setLoadedFile(null); onResult(null); onError(null); };
  const hasContent = tab === "url" ? /^https:\/\//i.test(urlInput.trim()) : jsonInput.trim() || tab === "example";
  const tabs: Array<{id: typeof tab; label: string}> = [
    { id:"paste", label:"Paste JSON" }, { id:"upload", label:"Upload File" }, { id:"example", label:"Try Example" }, { id:"url", label:"Scan URL" },
  ];

  return (
    <div className="border border-[var(--rule-strong)] bg-[var(--paper)]">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--rule-strong)] bg-[var(--paper-2)]">
        <span className="font-mono text-xs font-semibold flex items-center gap-2"><span className="text-[var(--ink-faint)]">$</span> scan --input ./package.json</span>
        {hasResult && <button onClick={handleReset} className="btn btn-outline" style={{padding:"4px 10px", fontSize:"11px"}}>new scan</button>}
      </div>

      {/* tabs as titleblock cells */}
      <div className="titleblock" style={{borderTop:"none", borderLeft:"none", borderRight:"none"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="tb-cell text-left" style={{
            background: tab===t.id ? "var(--ink)" : "var(--paper)",
            color: tab===t.id ? "var(--paper)" : "var(--ink)",
            transition:`background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)`,
            borderRight:"1px solid var(--rule-strong)"
          }}>
            <span className="l" style={{color: tab===t.id ? "var(--ink-faint)" : "var(--ink-faint)"}}>{t.label.toUpperCase()}</span>
            <span className="v" style={{fontSize:"11px"}}>{t.id}</span>
          </button>
        ))}
      </div>

      <div className="p-3.5 sm:p-4">
        {tab==="paste" && (
          <div>
            <div className="diagram-frame">
              <div className="diagram-caption" style={{borderLeft:"none", borderRight:"none", borderTop:"none"}}><span>package.json</span><span>{jsonInput?`${jsonInput.split("\n").length} lines · ${jsonInput.length} chars`:"paste manifest"}</span></div>
              <textarea value={jsonInput} onChange={e=>setJsonInput(e.target.value)} placeholder={'{\n  "name": "my-app",\n  "dependencies": {\n    "react": "^18.2.0",\n    "lodash": "^4.17.21"\n  }\n}'} className="w-full h-52 p-3.5 bg-white text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none resize-none" style={{border:"none"}} spellCheck={false} />
            </div>
            {loadedFile && <div className="mt-2 text-xs font-mono text-[var(--sev-low)]">loaded: {loadedFile}</div>}
          </div>
        )}
        {tab==="upload" && (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="diagram-frame">
              <div className="diagram-caption" style={{borderLeft:"none", borderRight:"none", borderTop:"none"}}><span>upload</span><span>package.json / lock</span></div>
              <div onClick={open} className="h-52 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white" style={{transition:`background var(--dur-fast) var(--ease)`}}>
                <div className="w-10 h-10 border border-[var(--rule-strong)] flex items-center justify-center font-mono text-[var(--ink-dim)]">↥</div>
                <p className="text-xs font-mono font-semibold">{isDragActive?"Drop file here":"Drag & drop or click to browse"}</p>
                <p className="text-[11px] font-mono text-[var(--ink-faint)]">package.json / package-lock.json / yarn.lock</p>
              </div>
            </div>
            {loadedFile && <div className="mt-2 flex items-center gap-2 text-xs font-mono text-[var(--sev-low)]">loaded: {loadedFile} <button onClick={()=>setTab("paste")} className="ml-auto btn btn-outline" style={{padding:"2px 8px", fontSize:"11px"}}>view →</button></div>}
          </div>
        )}
        {tab==="example" && (
          <div className="diagram-frame">
            <div className="diagram-caption" style={{borderLeft:"none", borderRight:"none", borderTop:"none"}}><span>example-package.json</span><span>sample data</span></div>
            <pre className="h-52 p-3.5 bg-white overflow-auto text-xs font-mono leading-relaxed text-[var(--ink-dim)]" style={{margin:0}}>{EXAMPLE_PACKAGE_JSON}</pre>
          </div>
        )}
        {tab==="url" && (
          <div className="space-y-3">
            <div className="diagram-frame">
              <div className="diagram-caption" style={{borderLeft:"none", borderRight:"none", borderTop:"none"}}><span>manifest URL</span><span>https only</span></div>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScan()} placeholder="https://raw.githubusercontent.com/user/repo/main/package.json" spellCheck={false} className="w-full px-3.5 py-3 bg-white text-sm font-mono placeholder:text-[var(--ink-faint)] focus:outline-none" style={{border:"none"}} />
            </div>
            <p className="text-[11px] font-mono text-[var(--ink-dim)]">Works with package.json, package-lock.json, requirements.txt, go.mod, Cargo.toml, pom.xml and more.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-3.5 sm:px-4 pb-4">
        <button onClick={handleScan} disabled={!hasContent} className={`btn btn-loading flex-1 min-w-[180px] ${scanning ? "is-loading" : ""}`} style={{opacity: !hasContent ? 0.35 : 1}} disabled={!hasContent || scanning}>
          <span style={{opacity: scanning ? 0.55 : 1, transition:`opacity var(--dur-fast) var(--ease)`}}>{tab==="url"?"SCAN MANIFEST FROM URL":"EXECUTE VULNERABILITY SCAN"}</span>
        </button>
        <label className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-dim)] cursor-pointer select-none">
          <input type="checkbox" className="blueprint-check" checked={includeDev} onChange={e=>setIncludeDev(e.target.checked)} />
          include dev deps
        </label>
      </div>
    </div>
  );
}

const EXAMPLE_PACKAGE_JSON = JSON.stringify({ name:"example-app", version:"1.0.0", dependencies:{ react:"^18.2.0", lodash:"^4.17.20", axios:"^0.21.0", express:"^4.17.1", jsonwebtoken:"^8.5.1" }, devDependencies:{ typescript:"^4.5.0", webpack:"^5.0.0" } }, null, 2);
