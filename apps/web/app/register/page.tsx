"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(email, username, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#111111", fontFamily: "monospace" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8 md:mb-10">
          <h1
            className="text-white font-bold tracking-widest text-xl md:text-2xl m-0"
            style={{ letterSpacing: "0.2em" }}
          >
            TRADEZEN
          </h1>
          <p className="text-xs md:text-sm mt-2" style={{ color: "#555", letterSpacing: "0.1em" }}>
            CREATE OPERATOR ACCOUNT
          </p>
        </div>

        <div
          className="p-6 md:p-8"
          style={{
            backgroundColor: "#1c1c1c",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
          }}
        >
          <div
            className="text-xs mb-6"
            style={{ color: "#555", letterSpacing: "0.15em" }}
          >
            OPERATOR REGISTRATION
          </div>

          {error && (
            <div
              className="text-xs tracking-wide mb-5 p-3"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                letterSpacing: "0.05em",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-500 tracking-widest mb-1.5">EMAIL</label>
              <input
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-3.5 py-3 text-white text-sm font-mono outline-none box-border focus:border-[#22d3ee]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@tradezen.io"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 tracking-widest mb-1.5">USERNAME</label>
              <input
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-3.5 py-3 text-white text-sm font-mono outline-none box-border focus:border-[#22d3ee]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_01"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 tracking-widest mb-1.5">PASSWORD</label>
              <input
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-3.5 py-3 text-white text-sm font-mono outline-none box-border focus:border-[#22d3ee]"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 tracking-widest mb-1.5">CONFIRM PASSWORD</label>
              <input
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-3.5 py-3 text-white text-sm font-mono outline-none box-border focus:border-[#22d3ee]"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-xs font-bold tracking-widest font-mono rounded disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading ? "#333" : "#ffffff",
                color: loading ? "#888" : "#111111",
                border: "none",
              }}
            >
              {loading ? "CREATING ACCOUNT..." : "REGISTER"}
            </button>
          </form>

          <div
            className="text-center mt-5 text-xs"
            style={{ color: "#555" }}
          >
            ALREADY REGISTERED?{" "}
            <Link
              href="/login"
              className="no-underline tracking-wide"
              style={{ color: "#888" }}
            >
              LOGIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
