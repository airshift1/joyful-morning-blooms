import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase will automatically handle the OAuth callback
        // The session will be set if successful
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate({ to: "/account" });
        } else {
          navigate({ to: "/auth" });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate({ to: "/auth" });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p>Signing in...</p>
      </div>
    </div>
  );
}
