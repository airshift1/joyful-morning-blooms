// Fallback photos for seeded products when the admin hasn't uploaded any yet.
import small from "@/assets/product-small.jpg";
import medium from "@/assets/product-medium.jpg";
import large from "@/assets/product-large.jpg";
import deluxe from "@/assets/product-deluxe.jpg";
import wedding from "@/assets/product-wedding.jpg";
import custom from "@/assets/product-custom.jpg";
import generic from "@/assets/product-medium.jpg";

const map: Record<string, string> = {
  "small-bouquet": small,
  "medium-bouquet": medium,
  "large-bouquet": large,
  "deluxe-bouquet": deluxe,
  "wedding-bundle": wedding,
  "custom-arrangement": custom,
};

export function fallbackImageFor(slug: string): string {
  return map[slug] ?? generic;
}
