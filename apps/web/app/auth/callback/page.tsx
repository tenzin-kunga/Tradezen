"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { setAccessToken } from "@/lib/api";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
      window.localStorage.setItem("tradezen_access_token", token);
    }

    // Full page reload so AuthProvider re-runs session restore with the stored token
    window.location.href = "/";
  }, [searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#111111", fontFamily: "monospace" }}
    >
      <div className="text-center">
        <h1 className="text-white text-xl tracking-widest mb-4">TRADEZEN</h1>
        <p className="text-sm" style={{ color: "#555" }}>
          AUTHENTICATING...
        </p>
      </div>
    </div>
  );
}
