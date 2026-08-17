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
        // Wait for Supabase to process the OAuth callback from URL hash
        // This gives the Supabase client time to extract and set the session
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session error:", error);
          navigate({ to: "/auth" });
          return;
        }
        
        if (data.session) {
          console.log("OAuth successful, redirecting to account");
          navigate({ to: "/account" });
        } else {
          console.log("No session found after OAuth");
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
