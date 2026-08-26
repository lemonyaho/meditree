"use client";

import { useEffect, useState } from "react";
import {
  HOME_CONTENT_KEY,
  LEGACY_HOME_KEY,
  cloneDefaultHomeContent,
  mergeLegacyHomeContent,
  type HomeContent,
} from "@/lib/home-content";

export function readHomeContent(): HomeContent {
  if (typeof window === "undefined") return cloneDefaultHomeContent();

  const raw = window.localStorage.getItem(HOME_CONTENT_KEY);

  if (raw) {
    try {
      return JSON.parse(raw) as HomeContent;
    } catch {}
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_HOME_KEY);
  if (legacyRaw) {
    try {
      return mergeLegacyHomeContent(JSON.parse(legacyRaw));
    } catch {}
  }

  return cloneDefaultHomeContent();
}

export function writeHomeContent(content: HomeContent) {
  window.localStorage.setItem(HOME_CONTENT_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event("meditree:home-content-updated"));
}

export default function useHomeContent() {
  const [content, setContent] = useState<HomeContent>(
    cloneDefaultHomeContent(),
  );

  useEffect(() => {
    const refresh = () => setContent(readHomeContent());

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("meditree:home-content-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(
        "meditree:home-content-updated",
        refresh,
      );
    };
  }, []);

  return content;
}
