"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "4px",
  padding: "12px 14px",
  color: "#ffffff",
  fontFamily: "monospace",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#888",
  letterSpacing: "0.12em",
  marginBottom: "6px",
  display: "block",
};

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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
      }}
    >
      <div style={{ width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.2em",
              margin: 0,
            }}
          >
            TRADEZEN
          </h1>
          <p style={{ color: "#555", fontSize: 11, letterSpacing: "0.1em", marginTop: 8 }}>
            AUTHENTICATE // ACCESS LEDGER
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#1c1c1c",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            padding: 32,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#555",
              letterSpacing: "0.15em",
              marginBottom: 24,
            }}
          >
            OPERATOR LOGIN
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                padding: "10px 14px",
                fontSize: 11,
                letterSpacing: "0.05em",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>EMAIL OR USERNAME</label>
              <input
                style={inputStyle}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="operator@tradezen.io"
                autoComplete="username"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => updateRememberMe(e.target.checked)}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                <span style={{ color: "#ccc", fontSize: 11, letterSpacing: "0.08em" }}>
                  Remember me
                </span>
              </label>
              <div style={{ marginTop: 8, fontSize: 10, color: rememberMe ? "#22c55e" : "#888", letterSpacing: "0.12em" }}>
                {rememberMe
                  ? "Saved preference: this device will stay logged in."
                  : "Not saved: you will need to log in again after closing the browser."}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: loading ? "#333" : "#ffffff",
                color: loading ? "#888" : "#111111",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: loading ? "default" : "pointer",
                fontFamily: "monospace",
              }}
            >
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 11,
              color: "#555",
            }}
          >
            NO ACCOUNT?{" "}
            <Link
              href="/register"
              style={{ color: "#888", textDecoration: "none", letterSpacing: "0.08em" }}
            >
              REGISTER
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
