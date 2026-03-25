import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";

// Layout & Pages
import { AppLayout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import Brain from "@/pages/brain";
import Automations from "@/pages/automations";
import Connections from "@/pages/connections";
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

  // Root redirect
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
      <Route path="/automations"><ProtectedRoute component={Automations} /></Route>
      <Route path="/connections"><ProtectedRoute component={Connections} /></Route>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
