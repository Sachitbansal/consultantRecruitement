"use client";

import { useState } from "react";
import { Field } from "@/components/Field";
import { TextInput } from "@/components/TextInput";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Full navigation so the /admin server component re-reads the
        // freshly-set session cookie on first render.
        window.location.href = "/admin";
        return;
      }

      if (res.status === 429) {
        setError("Too many login attempts. Wait a few minutes and try again.");
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Invalid email or password.");
      }
      setStatus("idle");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-medium tracking-wide text-navy uppercase mb-2">
            GOP &mdash; Growth Operating Partners
          </p>
          <h1 className="font-display text-2xl text-ink">Admin Login</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-hairline rounded-xl p-6 sm:p-8 flex flex-col gap-5"
        >
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {status === "submitting" ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
