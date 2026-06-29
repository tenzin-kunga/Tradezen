"use client";

import { useRouter } from "next/navigation";

export default function FabButton() {
  const router = useRouter();

  return (
    <button
      className="md:hidden fixed z-50 shadow-xl flex items-center justify-center active:scale-90 hover:scale-105"
      onClick={() => router.push("/add-trade")}
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "var(--accent-cyan)",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        bottom: 68,
        right: 16,
        transition: "transform 0.15s ease",
      }}
      aria-label="New Trade"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
