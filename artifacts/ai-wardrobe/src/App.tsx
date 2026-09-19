import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';

// Page Imports
import Landing from '@/pages/landing';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import ForgotPassword from '@/pages/auth/forgot-password';
import Dashboard from '@/pages/dashboard';
import Wardrobe from '@/pages/wardrobe/index';
import AddWardrobeItem from '@/pages/wardrobe/add';
import WardrobeDetail from '@/pages/wardrobe/detail';
import GenerateOutfit from '@/pages/outfits/generate';
import SavedOutfits from '@/pages/outfits/saved';
import StyleProfile from '@/pages/style-profile';
import ShoppingAssistant from '@/pages/shopping-assistant';
import Calendar from '@/pages/calendar';
import Friends from '@/pages/friends';
import Beauty from '@/pages/beauty';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={GenerateOutfit} />
      <Route path="/welcome" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      <Route path="/dashboard" component={Dashboard} />
      
      <Route path="/wardrobe" component={Wardrobe} />
      <Route path="/wardrobe/add" component={AddWardrobeItem} />
      <Route path="/wardrobe/:id/edit" component={AddWardrobeItem} />
      <Route path="/wardrobe/:id" component={WardrobeDetail} />
      
      <Route path="/outfits/generate" component={GenerateOutfit} />
      <Route path="/outfits/saved" component={SavedOutfits} />
      
      <Route path="/style-profile" component={StyleProfile} />
      <Route path="/shopping-assistant" component={ShoppingAssistant} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/friends" component={Friends} />
      <Route path="/beauty" component={Beauty} />
      <Route path="/settings" component={Settings} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
