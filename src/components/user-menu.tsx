import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Settings, Crown, LogIn, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const effectiveIsAdmin = isAdmin || isAdminEmail(user?.email);

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/auth"><LogIn className="h-4 w-4 mr-1.5" />Sign in</Link>
      </Button>
    );
  }

  const initials = user.email
    ?.split("@")[0]
    .split(".")
    .map((n) => n[0].toUpperCase())
    .join("")
    .slice(0, 2) || "U";

  const displayName = profile?.full_name || user.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <Avatar className="h-8 w-8 cursor-pointer border border-border/40">
            <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-semibold text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        {effectiveIsAdmin && (
          <div className="px-2 py-1.5 text-xs bg-primary/10 text-primary rounded mx-2 flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Admin
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            onClick={() => router.navigate({ to: "/account" })}
            className="w-full cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </button>
        </DropdownMenuItem>
        {effectiveIsAdmin && (
          <DropdownMenuItem asChild>
            <button
              onClick={() => router.navigate({ to: "/admin" })}
              className="w-full cursor-pointer"
            >
              <Crown className="h-4 w-4 mr-2" />
              Admin Panel
            </button>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/" });
            }}
            className="w-full cursor-pointer text-red-600 dark:text-red-400"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
