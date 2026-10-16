"use client";

import { useState } from "react";
import type { Caption } from "@/lib/captions";

export default function CaptionPhoto({ image }: { image: Caption["image"] }) {
  const [failed, setFailed] = useState(false);
  return <div className="caption-image">
    {image && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.url} alt={image.alt_text} loading="lazy" onError={() => setFailed(true)} />
    ) : <div className="image-unavailable">Image unavailable</div>}
    <span className="image-tag">COLUMBIA HUMOR</span>
  </div>;
}
