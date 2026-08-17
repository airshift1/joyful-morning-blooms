import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function usePageTracking() {
  const { user } = useAuth();

  useEffect(() => {
    async function trackPageView() {
      try {
        // Generate a simple session ID (just use user ID or random)
        const sessionId = user?.id || (typeof window !== 'undefined' ? sessionStorage.getItem("visitor_session_id") || crypto.randomUUID() : "");
        
        if (typeof window !== 'undefined' && !user) {
          sessionStorage.setItem("visitor_session_id", sessionId);
        }

        const { error } = await supabase.from("page_views").insert({
          user_id: user?.id || null,
          page_path: typeof window !== 'undefined' ? window.location.pathname : "",
          referrer: typeof window !== 'undefined' ? document.referrer : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : "",
          session_id: sessionId,
        });

        if (error) console.warn("Page tracking failed:", error.message);
      } catch (err) {
        console.warn("Page tracking error:", err);
      }
    }

    trackPageView();
  }, [user?.id]);
}
