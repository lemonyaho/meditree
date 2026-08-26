"use client";

import { useEffect } from "react";

export default function CollapseAllController() {
  useEffect(() => {
    function collapseAll() {
      document.querySelectorAll("details[open]").forEach((element) => {
        element.removeAttribute("open");
      });
    }

    window.addEventListener("meditree:collapse-all", collapseAll);
    return () =>
      window.removeEventListener("meditree:collapse-all", collapseAll);
  }, []);

  return null;
}
