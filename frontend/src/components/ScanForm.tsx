import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { scanDependencies, scanByUrl, scanStream } from "../api/client";
import type { ScanProgressEvent, ScanResponse } from "../types";

// Once per session: the landing page types the example JSON once.
let autoTypedOnce = false;

interface ScanFormProps {
  onResult: (res: ScanResponse | null, packageJsonValue?: string) => void;
  onLoading: (v: boolean) => void;
  onError: (err: string | null) => void;
  onProgress?: (ev: ScanProgressEvent) => void;
  hasResult?: boolean;
  autoTypeSignal?: number;
}

export function ScanForm({ onResult, onLoading, onError, onProgress, hasResult, autoTypeSignal }: ScanFormProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [lockType, setLockType] = useState("package-lock.json");
  const [tab, setTab] = useState<"paste" | "upload" | "example" | "url">("paste");
  const [urlInput, setUrlInput] = useState("");
  const [includeDev, setIncludeDev] = useState(true);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [typing, setTyping] = useState(false);

  // Landing-page demo: type the example manifest char-by-char once.
  useEffect(() => {
    if (!autoTypeSignal || autoTypedOnce) return;
    autoTypedOnce = true;
    setTab("paste");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setJsonInput(EXAMPLE_PACKAGE_JSON);
      return;
    }
    setTyping(true);
    let i = 0;
    const chunk = Math.max(8, Math.ceil(EXAMPLE_PACKAGE_JSON.length / 120));
    const id = setInterval(() => {
      i += chunk;
      setJsonInput(EXAMPLE_PACKAGE_JSON.slice(0, i));
      if (i >= EXAMPLE_PACKAGE_JSON.length) { clearInterval(id); setTyping(false); }
    }, 30);
    return () => clearInterval(id);
  }, [autoTypeSignal]);

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
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: undefined, maxFiles: 1, noClick: true, noKeyboard: true });

  const handleScan = async () => {
    onError(null); onLoading(true); setScanning(true);
    try {
      if (tab === "url") {
        if (!/^https:\/\//i.test(urlInput.trim())) { onError("Enter an https:// URL to a manifest file"); onLoading(false); setScanning(false); return; }
        const r = await scanByUrl({ url: urlInput.trim(), include_dev: includeDev }); onResult(r); return;
      }
      if (tab === "upload") {
        if (!lockInput.trim()) { onError("Please upload a lock file"); onLoading(false); setScanning(false); return; }
        const result: ScanResponse = typeof onProgress === "function"
          ? await scanStream({ package_json: "", lock_file: lockInput, lock_file_type: lockType, include_dev: includeDev }, onProgress)
          : await scanDependencies({ package_json: "", lock_file: lockInput, lock_file_type: lockType, min_severity: "low", include_dev: includeDev });
        onResult(result, lockInput); return;
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
  const hasContent = tab === "url" ? /^https:\/\//i.test(urlInput.trim()) : (tab === "upload" ? lockInput.trim() : jsonInput.trim()) || tab === "example";
  const tabs: Array<{id: typeof tab; label: string}> = [
    { id:"paste", label:"Paste JSON" }, { id:"upload", label:"Upload File" }, { id:"example", label:"Try Example" }, { id:"url", label:"Scan URL" },
  ];

  const textareaStyle: React.CSSProperties = { width:"100%", height:"192px", padding:"12px", background:"transparent", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--ink)", border:"1px solid var(--line)", borderRadius:"6px", outline:"none", resize:"none" };
  const preStyle: React.CSSProperties = { height:"192px", padding:"12px", overflow:"auto", fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", background:"var(--bg2)", border:"1px solid var(--line)", borderRadius:"6px" };
  const urlInputStyle: React.CSSProperties = { width:"100%", padding:"12px", background:"var(--bg2)", border:"1px solid var(--line)", borderRadius:"6px", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--ink)", outline:"none" };

  return (
    <div style={{border:"1px solid var(--line)", borderRadius:"8px", overflow:"hidden"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid var(--line)", background:"var(--bg2)"}}>
        <span style={{fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)"}}><span style={{color:"var(--pass)"}}>$</span> scan --input ./package.json</span>
        {hasResult && <button onClick={handleReset} style={{fontFamily:"var(--font-mono)", fontSize:"12px", padding:"4px 10px", background:"transparent", border:"1px solid var(--line)", borderRadius:"4px", color:"var(--muted)", cursor:"pointer"}}>New scan</button>}
      </div>
      <div style={{display:"flex", borderBottom:"1px solid var(--line)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1, padding:"8px 12px", background: tab===t.id ? "var(--line)" : "transparent",
            color: tab===t.id ? "var(--ink)" : "var(--muted)",
            fontFamily:"var(--font-mono)", fontSize:"12px", fontWeight:500, cursor:"pointer",
            border:"none", borderBottom: tab===t.id ? "2px solid var(--pass)" : "2px solid transparent",
            transition:`background var(--dur-base) var(--ease), color var(--dur-base) var(--ease)`,
          }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{padding:"16px"}}>
        {tab==="paste" && (
          <div>
            <textarea value={jsonInput} onChange={e=>setJsonInput(e.target.value)} placeholder={'{\n  "name": "my-app",\n  "dependencies": {\n    "react": "^18.2.0"\n  }\n}'} style={textareaStyle} spellCheck={false} />
            {loadedFile && <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--pass)", marginTop:"8px"}}>loaded: {loadedFile}</div>}
          </div>
        )}
        {tab==="upload" && (
          <div {...getRootProps()} style={{border:"1px dashed var(--line)", borderRadius:"6px", padding:"32px", textAlign:"center", cursor:"pointer"}}>
            <input {...getInputProps()} />
            <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>{isDragActive?"Drop file here":"Drag & drop or click to browse"}</p>
            <p style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted2)"}}>package.json / package-lock.json / yarn.lock</p>
          </div>
        )}
        {tab==="example" && (
          <pre style={preStyle}>{EXAMPLE_PACKAGE_JSON}</pre>
        )}
        {tab==="url" && (
          <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
            <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScan()} placeholder="https://raw.githubusercontent.com/user/repo/main/package.json" style={urlInputStyle} />
            <p style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted2)"}}>Works with package.json, package-lock.json, requirements.txt, go.mod, Cargo.toml, pom.xml and more.</p>
          </div>
        )}
      </div>
      <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", borderTop:"1px solid var(--line)"}}>
        <button onClick={handleScan} disabled={!hasContent || scanning || typing} style={{fontFamily:"var(--font-mono)", fontSize:"13px", fontWeight:500, background:"var(--pass)", color:"#08130D", border:"1px solid var(--pass)", padding:"8px 16px", display:"inline-flex", alignItems:"center", gap:"6px", borderRadius:"6px", cursor:"pointer", opacity:!hasContent?0.4:1, flex:1, transition:`background var(--dur-base) var(--ease)`}}>
          {scanning ? "Scanning…" : tab==="url" ? "Scan from URL" : "Execute vulnerability scan"}
        </button>
        <label style={{display:"flex", alignItems:"center", gap:"6px", fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", cursor:"pointer"}}>
          <input type="checkbox" checked={includeDev} onChange={e=>setIncludeDev(e.target.checked)} style={{accentColor:"var(--pass)"}} />
          include dev deps
        </label>
      </div>
    </div>
  );
}

const EXAMPLE_PACKAGE_JSON = JSON.stringify({ name:"example-app", version:"1.0.0", dependencies:{ react:"^18.2.0", lodash:"^4.17.20", axios:"^0.21.0", express:"^4.17.1", jsonwebtoken:"^8.5.1" }, devDependencies:{ typescript:"^4.5.0", webpack:"^5.0.0" } }, null, 2);
