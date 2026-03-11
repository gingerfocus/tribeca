"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
