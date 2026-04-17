import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Templates from "@/pages/templates";
import Editor from "@/pages/editor";
import Preview from "@/pages/preview";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import { ProfileProvider } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Preview is always public — NFC card links must work without login */}
      <Route path="/preview" component={Preview} />
      <Route path="/p/:id" component={Preview} />
      <Route path="/login" component={Login} />
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Landing} />
      </Route>
      <Route path="/templates">
        <ProtectedRoute component={Templates} />
      </Route>
      <Route path="/create/:templateId">
        <ProtectedRoute component={Editor} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
