"use client";

import { useEffect, useRef } from "react";

export default function KofiWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
    script.async = true;
    script.onload = () => {
      if (
        containerRef.current &&
        typeof (window as any).kofiwidget2 !== "undefined"
      ) {
        (window as any).kofiwidget2.init(
          "Give me a tip",
          "#ba348d",
          "S6S61TTP5F"
        );
        containerRef.current.innerHTML =
          (window as any).kofiwidget2.getHTML();
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: only remove if script is still in head
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="flex justify-center py-4">
      <div ref={containerRef} />
    </div>
  );
}
