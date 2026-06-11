"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("tradezen_remember_me");
    if (stored !== null) {
      setRememberMe(stored === "true");
    }
  }, []);

  function updateRememberMe(value: boolean) {
    setRememberMe(value);
    window.localStorage.setItem("tradezen_remember_me", String(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password, rememberMe);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleOAuthLogin(provider: "google" | "github") {
    window.location.href = `${API_URL}/auth/${provider}`;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "var(--bg-primary)", fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8 md:mb-10">
          <h1
            className="font-bold tracking-widest text-xl md:text-2xl m-0"
            style={{ letterSpacing: "0.2em", color: "var(--text-primary)" }}
          >
            TRADEZEN
          </h1>
          <p className="text-xs md:text-sm mt-2" style={{ color: "var(--text-dim)", letterSpacing: "0.1em" }}>
            AUTHENTICATE // ACCESS LEDGER
          </p>
        </div>

        <div
          className="p-6 md:p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            className="text-xs mb-6"
            style={{ color: "var(--text-dim)", letterSpacing: "0.15em" }}
          >
            OPERATOR LOGIN
          </div>

          {error && (
            <div
              className="text-xs tracking-wide mb-5 p-3"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid var(--accent-loss)",
                color: "var(--accent-loss)",
                letterSpacing: "0.05em",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              className="w-full py-3 text-xs font-bold tracking-widest rounded flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: "var(--text-primary)",
                color: "var(--bg-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              CONTINUE WITH GOOGLE
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              className="w-full py-3 text-xs font-bold tracking-widest rounded flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: "var(--border)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-hover)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 2.614 1.306.752-.209 1.565-.311 2.386-.311.821 0 1.635.102 2.386.311 1.606-1.628 2.614-1.306 2.614-1.306.652 1.652.24 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              CONTINUE WITH GITHUB
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>EMAIL OR USERNAME</label>
              <input
                className="w-full rounded px-3.5 py-3 text-sm outline-none box-border"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="operator@tradezen.io"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>PASSWORD</label>
              <input
                className="w-full rounded px-3.5 py-3 text-sm outline-none box-border"
                type="password"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => updateRememberMe(e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: "var(--text-primary)" }}
                />
                <span className="text-sm tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Remember me
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-xs font-bold tracking-widest rounded disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading ? "var(--border)" : "var(--text-primary)",
                color: loading ? "var(--text-dim)" : "var(--bg-primary)",
                border: "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          <div
            className="text-center mt-5 text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            NO ACCOUNT?{" "}
            <Link
              href="/register"
              className="no-underline tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              REGISTER
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
