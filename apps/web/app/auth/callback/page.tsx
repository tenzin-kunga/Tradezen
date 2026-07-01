"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/api";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
      window.localStorage.setItem("tradezen_access_token", token);
    }
    router.replace("/");
  }, [searchParams, router]);

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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#111111", fontFamily: "monospace" }}
        >
          <div className="text-center">
            <h1 className="text-white text-xl tracking-widest mb-4">
              TRADEZEN
            </h1>
            <p className="text-sm" style={{ color: "#555" }}>
              AUTHENTICATING...
            </p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
