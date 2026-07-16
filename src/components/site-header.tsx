import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ShoppingBag, User as UserIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();

  const nav = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-editorial flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-display text-xl tracking-tight">Petal &amp; Stem</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-foreground/70 hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="ghost">
                <Link to="/account"><UserIcon className="h-4 w-4 mr-1.5" />Account</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/shop"><ShoppingBag className="h-4 w-4 mr-1.5" />Shop</Link>
          </Button>
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground/70 hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container-editorial py-4 flex flex-col gap-3">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="py-2 text-foreground/80" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
              {user ? (
                <>
                  {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-2">Admin</Link>}
                  <Link to="/account" onClick={() => setOpen(false)} className="py-2">Account</Link>
                  <button onClick={async () => { await signOut(); setOpen(false); router.navigate({ to: "/" }); }} className="py-2 text-left">Sign out</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="py-2">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
