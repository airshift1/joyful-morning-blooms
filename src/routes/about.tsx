import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Petal & Stem" },
      { name: "description", content: "The story behind our small florist studio and the way we design." },
      { property: "og:title", content: "About — Petal & Stem" },
      { property: "og:description", content: "A small studio designing seasonal florals." },
    ],
  }),
  component: About,
});

function About() {
  const { data } = useQuery({
    queryKey: ["site_content", "about"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "about").maybeSingle();
      return (data?.value ?? {}) as Record<string, string>;
    },
  });
  const c = data ?? {};
  return (
    <div className="container-editorial py-16 md:py-28 max-w-3xl">
      <p className="eyebrow">Our story</p>
      <h1 className="mt-3 font-display text-5xl md:text-6xl">{c.title ?? "Our story"}</h1>
      <div className="mt-8 prose prose-lg text-lg leading-relaxed text-foreground/90 whitespace-pre-line">
        {c.body ?? ""}
      </div>
    </div>
  );
}
