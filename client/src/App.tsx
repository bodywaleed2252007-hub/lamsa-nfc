import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip"; // Kept TooltipProvider
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Templates from "@/pages/templates";
import Editor from "@/pages/editor";
import Preview from "@/pages/preview";
import { ProfileProvider } from "@/lib/store";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/templates" component={Templates} />
      <Route path="/create/:templateId" component={Editor} />
      <Route path="/preview" component={Preview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}

export default App;
