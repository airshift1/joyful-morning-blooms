import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  logo_path?: string | null;
  favicon_path?: string | null;
  instagram_url?: string;
};

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
    staleTime: 60_000,
  });
  return {
    branding: (data?.branding ?? {}) as Branding,
    shop: (data?.shop ?? { name: "Joyful Morning Blooms" }) as { name: string; tagline?: string },
    features: (data?.features ?? {}) as Record<string, boolean>,
    vase: (data?.vase ?? { enabled: true, price_cents: 300 }) as { enabled: boolean; price_cents: number },
  };
}
