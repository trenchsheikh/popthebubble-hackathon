"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, PartyPopper } from "lucide-react";

export type PublishResult = {
  slug: string;
  url: string;
  itemCount: number;
};

export function PublishedScreen({ result, restaurantName }: { result: PublishResult; restaurantName: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${result.url}` : result.url;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="studio-published">
      <span className="published-orb" aria-hidden>
        <PartyPopper size={26} />
      </span>
      <h2>{restaurantName} is live</h2>
      <p>
        {result.itemCount} {result.itemCount === 1 ? "dish" : "dishes"} published. Share the diner link or point your
        table QR codes here.
      </p>

      <div className="published-link">
        <span>{fullUrl}</span>
        <button type="button" onClick={copy} aria-label="Copy diner link">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <a className="primary-button" href={result.url} target="_blank" rel="noreferrer">
        Open the diner menu
        <ArrowUpRight size={18} />
      </a>
    </div>
  );
}
