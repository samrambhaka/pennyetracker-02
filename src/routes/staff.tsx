import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, MapPin, Navigation, Home } from "lucide-react";

export const Route = createFileRoute("/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Staff — Penny-eTracker" }] }),
});

function StaffPage() {
  const { user, loading, roles, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { role: "staff" } });
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return null;

  const isStaff = roles.includes("staff") || roles.includes("admin") || roles.includes("super_admin");

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">No staff access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user.email}) doesn't have staff privileges yet.
          </p>
          <Button onClick={signOut} variant="outline" className="mt-6">Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[oklch(0.98_0.01_240)] to-[oklch(0.95_0.03_250)]">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/landing" className="text-lg font-semibold tracking-tight">Penny-eTracker</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/landing"><Home className="mr-1 h-4 w-4" /> Home</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.email}</h1>
        <p className="mt-2 text-muted-foreground">Staff workspace</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to="/tracking">
            <Card className="flex h-32 items-center gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <MapPin className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Location Tracking</h3>
                <p className="text-sm text-muted-foreground">Find paths and distances</p>
              </div>
            </Card>
          </Link>
          <Link to="/navigate">
            <Card className="flex h-32 items-center gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <Navigation className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Map Navigation</h3>
                <p className="text-sm text-muted-foreground">Open in your maps app</p>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
