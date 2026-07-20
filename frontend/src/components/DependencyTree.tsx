

interface Props {
  dependencies?: { name: string; version: string }[];
  packageName: string;
}

export function DependencyTree({ dependencies, packageName }: Props) {
  if (!dependencies || dependencies.length === 0) return null;

  return (
    <div className="mt-2 mb-2 ml-4 pl-3 border-l-2 border-gray-700/50">
      <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500 mb-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
        <span>{packageName}</span>
      </div>
      {dependencies.map((dep) => (
        <div key={dep.name} className="flex items-center gap-2 py-0.5 text-xs font-mono">
          <span className="text-gray-600">└──</span>
          <span className="text-gray-300">{dep.name}</span>
          <span className="text-gray-600">@{dep.version}</span>
        </div>
      ))}
    </div>
  );
}
