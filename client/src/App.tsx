import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import TablePage from "@/pages/table";
import SharedTablePage from "@/pages/shared-table";
import CustomTableList from "@/pages/custom-table-list";
import CustomTableView from "@/pages/custom-table";
import CalendarPage from "@/pages/calendar";
import HelpPage from "@/pages/help";
import NotFound from "@/pages/not-found";

function Router() {
  // Background refetch when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch data when user comes back to app
        queryClient.refetchQueries({ 
          queryKey: ['/api/table-rows'],
          type: 'active'
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="min-h-screen pb-16 text-sm bg-white dark:bg-black">
      <Switch>
        <Route path="/">
          {() => <TablePage />}
        </Route>
        <Route path="/share/:shareId">
          {() => <SharedTablePage />}
        </Route>
        <Route path="/custom-tables">
          {() => <CustomTableList />}
        </Route>
        <Route path="/custom/:shareId">
          {() => <CustomTableView />}
        </Route>
        <Route path="/calendar">
          {() => <CalendarPage />}
        </Route>
        <Route path="/help">
          {() => <HelpPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
