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

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(() => !supabase);
    const [isAdmin, setIsAdmin] = useState(false);

    const adminEmails = useMemo(() => {
        return (ADMIN_EMAIL || "admin@nonexistant-email-address.org")
            .split(",")
            .map((e) => e.trim().toLowerCase());
    }, []);

    useEffect(() => {
        if (!supabase) {
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                setIsAdmin(adminEmails.includes(currentUser.email?.toLowerCase() || ""));
            }
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                setIsAdmin(adminEmails.includes(currentUser.email?.toLowerCase() || ""));
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [adminEmails]);

    const signIn = async (password: string) => {
        if (!supabase) {
            return { error: new Error("Supabase not configured") };
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password,
        });

        if (error) {
            return { error };
        }

        return { error: null };
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
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
