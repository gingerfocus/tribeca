"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signIn: (password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";

const isDev = process.env.NODE_ENV === "development";

function devLog(...args: unknown[]) {
    if (isDev) {
        console.log("[Auth]", ...args);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(() => !supabase);
    const [isAdmin, setIsAdmin] = useState(false);

    const adminEmails = useMemo(() => {
        return (ADMIN_EMAIL || "admin@example.com")
            .split(",")
            .map((e) => e.trim().toLowerCase());
    }, []);

    useEffect(() => {
        if (!supabase) {
            devLog("Supabase not configured, skipping auth init");
            return;
        }

        devLog("Initializing auth, getting session...");

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                devLog("Error getting session:", error.message);
            }
            const currentUser = session?.user ?? null;
            devLog("Session loaded:", currentUser ? `User: ${currentUser.email}` : "No user");
            setUser(currentUser);
            if (currentUser) {
                const admin = adminEmails.includes(currentUser.email?.toLowerCase() || "");
                devLog("Admin check:", admin ? "GRANTED" : "DENIED", `Email: ${currentUser.email}`);
                setIsAdmin(admin);
            }
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            devLog("Auth event:", event, session ? `User: ${session.user?.email}` : "No session");
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                const admin = adminEmails.includes(currentUser.email?.toLowerCase() || "");
                setIsAdmin(admin);
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [adminEmails]);

    const signIn = async (password: string) => {
        devLog("Attempting sign in for:", ADMIN_EMAIL);
        
        if (!supabase) {
            devLog("ERROR: Supabase not configured");
            return { error: new Error("Supabase not configured") };
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password,
        });

        if (error) {
            devLog("Sign in error:", error.message);
            return { error };
        }

        devLog("Sign in successful");
        return { error: null };
    };

    const signOut = async () => {
        devLog("Signing out...");
        if (!supabase) return;
        await supabase.auth.signOut();
        devLog("Signed out");
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
