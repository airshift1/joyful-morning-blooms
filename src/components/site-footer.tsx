import { Link } from "@tanstack/react-router";
import { Instagram, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { brandingUrl } from "@/lib/photo-url";

export function SiteFooter() {
  const { branding, shop } = useSiteSettings();
  const logo = brandingUrl(branding.logo_path);
  const insta = branding.instagram_url?.trim();

  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container-editorial py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={shop.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <Sparkles className="h-4 w-4 text-accent" />
            )}
            <span className="font-display text-xl">{shop.name}</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Handcrafted florals for life's moments.
          </p>
          {insta && (
            <a href={insta} target="_blank" rel="noopener noreferrer"
               className="mt-4 inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground">
              <Instagram className="h-4 w-4" /> Follow on Instagram
            </a>
          )}
        </div>
        <div>
          <p className="eyebrow mb-3">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="text-foreground/80 hover:text-foreground">All arrangements</Link></li>
            <li><Link to="/about" className="text-foreground/80 hover:text-foreground">About</Link></li>
            <li><Link to="/contact" className="text-foreground/80 hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Account</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth" className="text-foreground/80 hover:text-foreground">Sign in</Link></li>
            <li><Link to="/account" className="text-foreground/80 hover:text-foreground">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Follow</p>
          {insta ? (
            <a href={insta} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground/80 hover:text-foreground inline-flex items-center gap-2">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Add your Instagram link in Admin → Branding.</p>
          )}
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-editorial py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {shop.name}. All rights reserved.</p>
          <p>Made with care.</p>
        </div>
      </div>
    </footer>
  );
}
