import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container-editorial py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-display text-xl">Petal &amp; Stem</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Handcrafted florals for life's moments.
          </p>
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
          <p className="eyebrow mb-3">Studio</p>
          <p className="text-sm text-muted-foreground">Tue–Sat  ·  10a–6p</p>
          <p className="text-sm text-muted-foreground">By appointment for weddings.</p>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-editorial py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Petal &amp; Stem. All rights reserved.</p>
          <p>Made with care.</p>
        </div>
      </div>
    </footer>
  );
}
