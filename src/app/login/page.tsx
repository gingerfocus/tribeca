"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const router = useRouter();

    if (user) {
        router.push("/admin");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { error: signInError } = await signIn(password);

        if (signInError) {
            setError("Invalid password");
            setLoading(false);
            return;
        }

        router.push("/admin");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex items-center justify-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-600 to-purple-600">
                        <svg
                            className="h-6 w-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <h1 className="bg-gradient-to-r from-maroon-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
                        Tribeca Admin
                    </h1>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
                    <h2 className="mb-6 text-center text-xl font-semibold text-zinc-100">
                        Sign in to continue
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-zinc-400"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-gradient-to-r from-maroon-600 to-purple-600 px-4 py-3 font-medium text-white transition-all hover:from-maroon-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-zinc-500 hover:text-purple-400 transition-colors"
                    >
                        ← Back to Race Results
                    </Link>
                </div>
            </div>
        </div>
    );
}
