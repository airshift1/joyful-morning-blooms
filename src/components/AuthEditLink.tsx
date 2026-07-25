import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export default function AuthEditLink() {
  const { user, isAdmin, loading } = useAuth();
  const ownerEmail = import.meta.env.VITE_OWNER_EMAIL || "";
  if (loading) return null;
  if (!user) return null;
  if (isAdmin || (user.email && user.email === ownerEmail)) {
    return (
      <Link to="/admin/edit-home" className="mt-2 text-sm inline-flex items-center px-3 py-2 rounded-md border border-input">
        Edit home
      </Link>
    );
  }
  return null;
}
