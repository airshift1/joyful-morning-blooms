import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const generateUserCode = () => {
  const prefix = "JMB";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};

export function useVisitorTracking() {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        let code = localStorage.getItem("visitor_user_code");

        // Create new profile if first visit
        if (!code) {
          code = generateUserCode();

          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              user_code: code,
              full_name: "",
              email: "",
              first_seen_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              visit_count: 1,
              return_count: 0,
              total_purchases: 0,
              total_spent_cents: 0,
              is_verified: false,
            })
            .select()
            .single();

          if (!createError && newProfile) {
            localStorage.setItem("visitor_user_code", newProfile.user_code);
          }
        }

        // Record the visit
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_code", code)
          .single();

        if (profile) {
          // Log visit
          await supabase.from("visits").insert({
            profile_id: profile.id,
            user_code: code,
            visited_at: new Date().toISOString(),
            referrer: document.referrer || "",
            user_agent: navigator.userAgent,
          });

          // Update visit counts
          const nextCount = (profile.visit_count ?? 0) + 1;
          const lastSeenTime = profile.last_seen_at
            ? new Date(profile.last_seen_at).getTime()
            : 0;
          const isReturn =
            lastSeenTime > 0 &&
            lastSeenTime < Date.now() - 60 * 60 * 1000; // More than 1 hour ago

          await supabase
            .from("profiles")
            .update({
              last_seen_at: new Date().toISOString(),
              visit_count: nextCount,
              return_count: isReturn
                ? (profile.return_count ?? 0) + 1
                : profile.return_count ?? 0,
            })
            .eq("id", profile.id);
        }
      } catch (err) {
        console.error("Visitor tracking error:", err);
      }
    };

    trackVisit();
  }, []);
}
