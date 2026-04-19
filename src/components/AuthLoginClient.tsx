"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowRight,
  BadgeCheck,
  KeyRound,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import type { DemoUser, UserKind } from "@/lib/demo-auth";

interface AuthLoginClientProps {
  kind: UserKind;
  users: DemoUser[];
}

export function AuthLoginClient({ kind, users }: AuthLoginClientProps) {
  const router = useRouter();
  const primary = users[0];
  const [identifier, setIdentifier] = useState(primary.email);
  const [password, setPassword] = useState(primary.password);
  const [selectedUserId, setSelectedUserId] = useState(primary.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? primary,
    [primary, selectedUserId, users]
  );

  const chooseUser = (user: DemoUser) => {
    setSelectedUserId(user.id);
    setIdentifier(user.email);
    setPassword(user.password);
    setError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const Icon = kind === "admin" ? ShieldCheck : Truck;

  return (
    <main className="app-bg min-h-screen text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <section className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#26d69b] text-[#03120c]">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xl font-black">FleetIQ</p>
              <p className="text-sm font-semibold text-[#8ea198]">
                {kind === "admin" ? "Admin access" : "Driver access"}
              </p>
            </div>
          </div>

          <h1 className="mt-10 text-5xl font-black leading-tight">
            {kind === "admin"
              ? "Command center for fleet operations."
              : "Driver workflow for every assigned trip."}
          </h1>
          <p className="mt-5 text-base leading-7 text-[#8ea198]">
            {kind === "admin"
              ? "Log in as fleet owner, dispatcher, safety, or operations to manage loads, drivers, compliance, documents, and cost intelligence."
              : "Log in as a demo driver to accept loads, start trips, track HOS, review stops, upload documents, and use the trip copilot."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              kind === "admin" ? "Protected admin dashboard" : "Protected driver dashboard",
              kind === "admin" ? "Load and driver intelligence" : "AI trip assistant",
              kind === "admin" ? "Cost and compliance controls" : "Documents and status timeline",
              "Demo quick-fill accounts",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d1210] p-3"
              >
                <BadgeCheck className="h-5 w-5 text-[#26d69b]" />
                <span className="text-sm font-bold">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black text-[#26d69b]">Demo users</p>
              <h2 className="mt-2 text-2xl font-black">
                Login as {selectedUser.name}
              </h2>
              <div className="mt-4 grid gap-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => chooseUser(user)}
                    className={clsx(
                      "rounded-lg border p-3 text-left transition",
                      selectedUserId === user.id
                        ? "border-[#26d69b]/55 bg-[#13271f]"
                        : "border-white/10 bg-[#0d1210] hover:border-[#26d69b]/35"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#070908] text-sm font-black text-white ring-1 ring-white/10">
                        {initials(user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-black text-white">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs font-semibold text-[#8ea198]">
                          {user.role} - {user.username}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">
                    {kind === "admin" ? "Admin Login" : "Driver Login"}
                  </p>
                  <p className="mt-1 text-xs text-[#8ea198]">
                    Credentials are quick-filled for demo.
                  </p>
                </div>
                <KeyRound className="h-5 w-5 text-[#26d69b]" />
              </div>

              <label className="mt-5 grid gap-2 text-sm font-bold text-white">
                Email or username
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="rounded-lg border border-white/10 bg-[#070908] px-3 py-3 font-normal text-white outline-none focus:border-[#26d69b] focus:ring-2 focus:ring-[#26d69b]/20"
                />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-bold text-white">
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="rounded-lg border border-white/10 bg-[#070908] px-3 py-3 font-normal text-white outline-none focus:border-[#26d69b] focus:ring-2 focus:ring-[#26d69b]/20"
                />
              </label>

              <div className="mt-4 rounded-lg border border-white/10 bg-[#070908] p-3 text-xs text-[#8ea198]">
                <p className="font-black text-white">Demo credentials</p>
                <p className="mt-1">Username: {selectedUser.username}</p>
                <p>Email: {selectedUser.email}</p>
                <p>Password: {selectedUser.password}</p>
              </div>

              {error ? (
                <div className="mt-4 rounded-lg border border-[#ff5d6c]/30 bg-[#211015] p-3 text-sm font-semibold text-[#ff93a0]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#26d69b] px-4 py-3 text-sm font-black text-[#03120c] hover:bg-[#55f0b1] disabled:opacity-60"
              >
                {loading ? "Signing in" : `Enter ${kind === "admin" ? "Admin Dashboard" : "Driver Dashboard"}`}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#8ea198]">
                <a href={kind === "admin" ? "/login/driver" : "/login/admin"} className="hover:text-white">
                  {kind === "admin" ? "Driver login" : "Admin login"}
                </a>
                <a href="/login" className="hover:text-white">
                  All login options
                </a>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
