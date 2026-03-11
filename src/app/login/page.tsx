"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push("/admin");
        }
    }, [user, router]);

    if (user) {
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex items-center justify-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cardinal-800 shadow-md">
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
                    <h1 className="text-3xl font-bold text-cardinal-900">
                        Tribeca Admin
                    </h1>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="mb-6 text-center text-xl font-semibold text-gray-700">
                        Sign in to continue
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-gray-500"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-cardinal-400 focus:outline-none focus:ring-2 focus:ring-cardinal-400/30"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-cardinal-800 px-4 py-3 font-medium text-white transition-all hover:bg-cardinal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-cardinal-700 transition-colors"
                    >
                        ← Back to Race Results
                    </Link>
                </div>
            </div>
        </div>
    );
}