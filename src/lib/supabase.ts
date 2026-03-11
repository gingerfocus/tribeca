import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SupabaseInstance = SupabaseClient | null;

function getSupabaseClient(): SupabaseInstance {
    let supabaseUrl;
    let supabasePublishableKey;

    if (process.env.NODE_ENV === "development") {
        supabaseUrl = "http://127.0.0.1:54321";
        supabasePublishableKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
    } else {
        supabaseUrl = "https://chkulbjaexjhqzltdfth.supabase.co";
        supabasePublishableKey = "sb_publishable_0T-zu-ZmhPEeJTESOgZfYA_Ff0AcAr8";
    }
    if (!supabaseUrl || !supabasePublishableKey) {
        return null;
    }

    try {
        return createClient(supabaseUrl, supabasePublishableKey);
    } catch {
        return null;
    }
}

export const supabase: SupabaseInstance = getSupabaseClient();
