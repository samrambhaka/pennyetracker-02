import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Truck } from "lucide-react";

type RoleParam = "admin" | "staff";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search.role === "admin" ? "admin" : "staff") as RoleParam,
  }),
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Penny-eTracker" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const target = role === "admin" ? "/admin" : "/staff";
  const Icon = role === "admin" ? ShieldCheck : Truck;
  const label = role === "admin" ? "Admin" : "Staff";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { full_name: name, role },
          },
        });
        if (error) throw error;
        navigate({ to: target });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      }
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchRole = role === "admin" ? "staff" : "admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[oklch(0.98_0.01_240)] to-[oklch(0.95_0.03_250)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle>
            {label} {mode === "signin" ? "Login" : "Sign up"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? `Sign in to your ${label.toLowerCase()} account.`
              : `Create a new ${label.toLowerCase()} account.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? `Sign in as ${label}` : `Sign up as ${label}`}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
          <Link
            to="/auth"
            search={{ role: switchRole as RoleParam }}
            className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Switch to {switchRole} login
          </Link>
          <Link to="/landing" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
