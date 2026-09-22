export interface VulnCheckerConfig {
  serverUrl: string;
  ignorePackages: string[];
  minSeverity: string;
}

export function getConfig(): VulnCheckerConfig {
  const config = {
    serverUrl: "http://localhost:8000",
    ignorePackages: [],
    minSeverity: "low"
  };

  return config;
}
