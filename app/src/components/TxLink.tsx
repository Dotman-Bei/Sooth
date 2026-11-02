"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { txUrl, addressUrl, PREVIEW } from "@/lib/config";
import { short } from "@/lib/format";
import styles from "./TxLink.module.css";

/** A tx hash linked to the explorer (Blockscout on Chikyū). In preview, hashes are samples and say so,
 *  unless `real` marks a recorded on-chain transaction (Verify's demo txs). */
export function TxLink({ hash, label, real = false }: { hash: string; label?: string; real?: boolean }) {
  const url = txUrl(hash);
  const text = label ? <span>{label}</span> : <span className="mono">{short(hash)}</span>;
  if ((PREVIEW && !real) || !url) {
    return (
      <span className={styles.link} title={hash}>
        {text}
        <span className={styles.sample}>sample</span>
      </span>
    );
  }
  return (
    <a className={styles.link} href={url} target="_blank" rel="noreferrer" title={hash}>
      {text}
      <ArrowUpRight size={16} strokeWidth={1.5} />
    </a>
  );
}

export function AddressLink({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const url = addressUrl(address);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <span className={styles.address}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mono" title={address}>
          {short(address)}
        </a>
      ) : (
        <span className="mono" title={address}>
          {short(address)}
        </span>
      )}
      <button className={styles.copy} onClick={copy} aria-label={copied ? "Copied" : "Copy address"}>
        {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
      </button>
    </span>
  );
}
