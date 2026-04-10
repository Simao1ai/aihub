import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// ── Auth token helpers ──────────────────────────────────────────────────────
function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem("ai-hub-storage");
    if (!stored) return null;
    return JSON.parse(stored)?.state?.account?.token ?? null;
  } catch { return null; }
}

// Wire the Orval-generated API client to use the Bearer token
setAuthTokenGetter(getStoredToken);

// Global fetch interceptor — adds Bearer token to all /api/* calls
// and handles 401 (expired session) by logging out and redirecting to login
const _originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input
    : input instanceof URL ? input.toString()
    : (input as Request).url;
  const isApi = url.startsWith("/api/");
  const isPublic = url.startsWith("/api/auth/login") || url.startsWith("/api/auth/workspaces");
  if (isApi && !isPublic) {
    const token = getStoredToken();
    if (token) {
      const headers = new Headers(init.headers);
      if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
      init = { ...init, headers };
    }
  }
  const response = await _originalFetch(input, init);
  // On 401, session has expired — clear stored auth, redirect to login, and throw
  // so that component-level catch blocks don't try to parse the error body as data
  if (response.status === 401 && isApi && !isPublic) {
    try { localStorage.removeItem("ai-hub-storage"); } catch {}
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return response;
};

// Layout & Pages
import { AppLayout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import Brain from "@/pages/brain";
import PowerUps from "@/pages/power-ups";
import Automations from "@/pages/automations";
import Pipelines from "@/pages/pipelines";
import Connections from "@/pages/connections";
import Workspaces from "@/pages/workspaces";
import Tasks from "@/pages/tasks";
import Contacts from "@/pages/contacts";
import Social from "@/pages/social";
import Ads from "@/pages/ads";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [location, setLocation] = useLocation();

  if (location === '/') {
    if (isAuthenticated) setLocation('/dashboard');
    else setLocation('/login');
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/agents"><ProtectedRoute component={Agents} /></Route>
      <Route path="/brain"><ProtectedRoute component={Brain} /></Route>
      <Route path="/power-ups"><ProtectedRoute component={PowerUps} /></Route>
      <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
      <Route path="/contacts"><ProtectedRoute component={Contacts} /></Route>
      <Route path="/social"><ProtectedRoute component={Social} /></Route>
      <Route path="/ads"><ProtectedRoute component={Ads} /></Route>
      <Route path="/automations"><ProtectedRoute component={Automations} /></Route>
      <Route path="/pipelines"><ProtectedRoute component={Pipelines} /></Route>
      <Route path="/connections"><ProtectedRoute component={Connections} /></Route>
      <Route path="/workspaces"><ProtectedRoute component={Workspaces} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="bottom-right" theme="dark" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
