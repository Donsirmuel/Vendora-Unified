import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 page-anim">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-12 text-center shadow-2xl shadow-cyan-900/40">
        <div className="absolute inset-x-0 -top-32 h-64 blur-3xl" aria-hidden="true">
          <div className="mx-auto h-full w-2/3 rounded-full bg-primary/20"></div>
        </div>
        <div className="relative space-y-6">
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-4 shadow-lg shadow-primary/20 ring-1 ring-white/10">
              <img src="/brand/logo-light.svg" alt="Vendora" className="h-9 w-auto" loading="lazy" />
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">Page not found</p>
            <h1 className="text-4xl font-semibold text-white">This route slipped off the ledger</h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground">
              We couldn't find <span className="font-mono text-primary-foreground/90">{location.pathname}</span>. Double-check the URL or head back to the dashboard to keep managing your orders.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Go back
            </Button>
            <Button asChild className="bg-gradient-primary text-primary-foreground">
              <Link to="/">
                Return home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
