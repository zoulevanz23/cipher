import { useState } from "react";

interface Props {
  content: string;
}

export function CopyButton({ content }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs font-mono px-2.5 py-1 rounded-lg border border-border text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-all"
    >
      {copied ? "copied!" : "copy"}
    </button>
  );
}
