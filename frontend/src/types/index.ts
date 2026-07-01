export interface Package {
  name: string;
  version: string;
  type: string;
}

export interface Vulnerability {
  id: string;
  summary: string;
  aliases: string[];
  severity: Severity;
  published: string;
  affected_versions: string[];
  references: { url: string }[];
}

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface ScanResult {
  package: Package;
  vulnerabilities: Vulnerability[];
  max_severity: Severity | "NONE";
  vulnerable: boolean;
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
}

export interface ScanRequest {
  package_json: string;
  lock_file?: string;
  lock_file_type?: string;
  min_severity?: string;
}
