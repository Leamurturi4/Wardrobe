import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { User, Bell, Shield, Sparkles, Moon, Sun, CreditCard, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Configuration</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Manage your digital atelier experience. Customize the AI's behavior, adjust aesthetics, and control your data privacy.
          </p>
        </header>

        <Tabs defaultValue="account" className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-1 p-0">
              <TabsTrigger value="account" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <User className="w-4 h-4 mr-3" /> Account
              </TabsTrigger>
              <TabsTrigger value="appearance" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Moon className="w-4 h-4 mr-3" /> Appearance
              </TabsTrigger>
              <TabsTrigger value="ai" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Sparkles className="w-4 h-4 mr-3" /> AI Engine
              </TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Bell className="w-4 h-4 mr-3" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Shield className="w-4 h-4 mr-3" /> Privacy & Security
              </TabsTrigger>
              <TabsTrigger value="subscription" className="w-full justify-start px-4 py-2.5 rounded-xl text-left data-[state=active]:bg-secondary data-[state=active]:text-foreground font-medium text-muted-foreground hover:bg-secondary/50 transition-colors">
                <CreditCard className="w-4 h-4 mr-3" /> Subscription
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-w-0">
            <TabsContent value="account" className="mt-0 space-y-8 outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tight mb-1">Profile Details</h3>
                  <p className="text-sm text-muted-foreground">Manage your personal information.</p>
                </div>
                <div className="grid gap-6 bg-card border border-border/50 p-6 sm:p-8 rounded-[2rem]">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="Jane Doe" className="bg-background max-w-md rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="jane@example.com" className="bg-background max-w-md rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger className="max-w-md bg-background rounded-xl">
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 flex">
                    <Button className="rounded-full px-8">Save Changes</Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tight text-destructive mb-1">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">Irreversible actions concerning your account data.</p>
                </div>
                <div className="bg-destructive/5 border border-destructive/20 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row gap-6 items-start justify-between">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      Permanently remove your account, wardrobe data, styling history, and social connections.
                    </p>
                  </div>
                  <Button variant="destructive" className="rounded-full shrink-0">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-8 outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tight mb-1">Theme</h3>
                  <p className="text-sm text-muted-foreground">Select your preferred interface aesthetic.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div 
                    className={`p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col space-y-4 ${theme !== 'dark' ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-border'}`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="h-24 rounded-xl bg-[#FDFBF7] border border-[#E5E5E5] flex items-center justify-center shadow-sm">
                      <Sun className="w-8 h-8 text-[#1A1A1A]" />
                    </div>
                    <div className="text-center font-medium">Light Mode</div>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col space-y-4 ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-border'}`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="h-24 rounded-xl bg-[#18181A] border border-[#2E2E32] flex items-center justify-center shadow-sm">
                      <Moon className="w-8 h-8 text-[#F5F5F4]" />
                    </div>
                    <div className="text-center font-medium">Dark Mode</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 space-y-8 outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tight mb-1">Algorithm Preferences</h3>
                  <p className="text-sm text-muted-foreground">Tune the personal stylist's recommendations.</p>
                </div>
                <div className="bg-card border border-border/50 p-6 sm:p-8 rounded-[2rem] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 max-w-md">
                      <Label className="text-base">Weather Integration</Label>
                      <p className="text-sm text-muted-foreground">Allow the AI to read your local weather forecasts for outfit planning.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 max-w-md">
                      <Label className="text-base">Boldness Parameter</Label>
                      <p className="text-sm text-muted-foreground">Increase the frequency of unconventional or statement outfit combinations.</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 max-w-md">
                      <Label className="text-base">Budget-Aware Shopping</Label>
                      <p className="text-sm text-muted-foreground">Filter acquisition recommendations based on historical spending habits.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Other tabs gracefully handled as empty states for now if needed, but adding basic structure */}
            <TabsContent value="notifications" className="mt-0 space-y-8 outline-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium tracking-tight mb-1">Communication</h3>
                  <p className="text-sm text-muted-foreground">Manage how the atelier contacts you.</p>
                </div>
                <div className="bg-card border border-border/50 p-6 sm:p-8 rounded-[2rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Outfit Brief</Label>
                      <p className="text-sm text-muted-foreground">Morning push notification with your planned attire.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Restock Alerts</Label>
                      <p className="text-sm text-muted-foreground">Email alerts when wishlist items are back in stock.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="privacy" className="mt-0 space-y-8 outline-none">
              <div className="p-8 text-center bg-card/50 border border-dashed border-border rounded-[2rem]">
                <Shield className="w-8 h-8 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h4 className="font-medium mb-2">Privacy Center</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">Manage two-factor authentication, download your data archive, and manage connected third-party integrations.</p>
              </div>
            </TabsContent>

            <TabsContent value="subscription" className="mt-0 space-y-8 outline-none">
              <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-8 rounded-[2rem]">
                <Badge variant="outline" className="bg-primary text-primary-foreground mb-4 border-none">Atelier Pro</Badge>
                <h3 className="text-2xl font-serif font-medium tracking-tight mb-2">Premium Member</h3>
                <p className="text-muted-foreground mb-6 max-w-md">You have unlimited access to AI styling, unlimited wardrobe items, and priority support.</p>
                <Button variant="outline" className="rounded-full bg-background">Manage Billing</Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}
