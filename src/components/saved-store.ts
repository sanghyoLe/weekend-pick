"use client";
import { useSyncExternalStore } from "react";
const KEY = "weekend-pick:saved:v1";
const EVENT = "weekend-pick:saved";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function snapshot() { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; } }
function parse(raw: string): string[] {
  try { const data: unknown = JSON.parse(raw); return Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id)))].slice(0, 100) : []; } catch { return []; }
}
export function useSaved() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const ids = parse(raw);
  const toggle = (id: string) => {
    try {
      const current = parse(snapshot());
      if (!current.includes(id) && current.length >= 100) return false;
      localStorage.setItem(KEY, JSON.stringify(current.includes(id) ? current.filter(i => i !== id) : [...current, id]));
      window.dispatchEvent(new Event(EVENT));
      return true;
    } catch { return false; }
  };
  return { ids, toggle, raw };
}
