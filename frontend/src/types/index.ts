export interface Package {
  name: string;
  version: string;
  type: string;
  ecosystem?: string;
  license?: string;
  dependencies?: { name: string; version: string }[];
}

export interface Vulnerability {
  id: string;
  summary: string;
  aliases: string[];
  severity: Severity;
  published: string;
  affected_versions: string[];
  references: { url: string }[];
  cvss_score?: number | null;
  cvss_vector?: string;
  cwe_id?: string;
  source?: string;
  epss_score?: number | null;
  epss_percentile?: number | null;
}

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface FixSuggestion {
  package_name: string;
  current_version: string;
  fixed_version: string;
  latest_version: string;
  recommended_version: string;
  ecosystem: string;
  risk?: string;
  risk_label?: string;
}

export interface ScanResult {
  package: Package;
  vulnerabilities: Vulnerability[];
  max_severity: Severity | "NONE";
  vulnerable: boolean;
  unmaintained?: boolean;
  health_score?: number;
  status?: string;
  scan_error?: string | null;
}

export interface ScanResponse {
  summary: {
    total_packages: number;
    vulnerable_packages: number;
    total_vulnerabilities: number;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  results: ScanResult[];
  fixes: FixSuggestion[];
  sources_used?: string[];
  scan_status?: string;
  scan_errors?: { package: string; version: string; status: string; error?: string | null }[];
}

export interface ScanRequest {
  package_json: string;
  lock_file?: string;
  lock_file_type?: string;
  min_severity?: string;
  ecosystem?: string;
  include_dev?: boolean;
  ignore?: string[];
  ignore_until?: Record<string, string>;
}

export interface ScanUrlRequest {
  url: string;
  filename?: string;
  min_severity?: string;
  ecosystem?: string;
  include_dev?: boolean;
  ignore?: string[];
  ignore_until?: Record<string, string>;
}

export interface ScanProgressEvent {
  event: "started" | "progress" | "done" | "error";
  total?: number;
  index?: number;
  package?: string;
  version?: string;
  status?: string;
  vulnerabilities?: number;
  scan?: ScanResponse;
  detail?: string;
}
