"use client";

import { useEffect, useState } from "react";
import { fetchAuthenticatedFile } from "@/lib/api";

interface Props {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AuthenticatedImage({ src, alt, className, style }: Props) {
  const [result, setResult] = useState<{ src: string; objectUrl?: string; error?: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    let loadedUrl: string | null = null;
    fetchAuthenticatedFile(src).then(
      (url) => {
        loadedUrl = url;
        if (active) setResult({ src, objectUrl: url });
        else URL.revokeObjectURL(url);
      },
      () => { if (active) setResult({ src, error: true }); },
    );
    return () => {
      active = false;
      if (loadedUrl) URL.revokeObjectURL(loadedUrl);
    };
  }, [src]);

  if (result?.src !== src || (!result.objectUrl && !result.error)) {
    return <span aria-live="polite">Loading image...</span>;
  }
  if (result.error) return <span role="img" aria-label={`${alt} unavailable`}>Unable to load image</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={result.objectUrl} alt={alt} className={className} style={style} />;
}
