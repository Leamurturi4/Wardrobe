import { AppShell } from "@/components/layout/AppShell";
import { mockFriends, mockRooms } from "@/lib/mock-social";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus, ArrowRight, MessageSquare } from "lucide-react";

export default function Friends() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight">Circle</h1>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              Coordinate styles, share wardrobes, and plan outfits together in private styling rooms.
            </p>
          </div>
          <Button className="rounded-full shrink-0 group">
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" /> 
            Invite Friend
          </Button>
        </header>

        {mockFriends.length === 0 ? (
          <div className="py-24 text-center space-y-6 bg-card/30 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center text-muted-foreground">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-medium">Your circle is empty</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Invite friends to share wardrobes, get second opinions, and coordinate for events.
              </p>
            </div>
            <Button variant="outline" className="rounded-full">Invite your first friend</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Friends Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Connections</h2>
              <div className="space-y-3">
                {mockFriends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/30 transition-colors group cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12 border border-border/50">
                          <AvatarFallback className="bg-background text-foreground font-medium text-xs">{friend.avatar}</AvatarFallback>
                        </Avatar>
                        {friend.status === 'Online' && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-background bg-green-500 rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-xs text-muted-foreground">{friend.compatibility}% Style Match</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Styling Rooms Main Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Styling Rooms</h2>
                <Button variant="ghost" size="sm" className="text-xs rounded-full">Create Room <Plus className="w-3 h-3 ml-1" /></Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {mockRooms.map(room => (
                  <Card key={room.id} className="group border-border/50 shadow-sm bg-card/40 backdrop-blur-sm hover:border-border hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-xl font-medium tracking-tight mb-1">{room.name}</h3>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <span className="bg-secondary px-2 py-0.5 rounded-full text-xs mr-3">{room.date}</span>
                            {room.itemCount} Items Saved
                          </div>
                        </div>
                        <div className="flex -space-x-3">
                          {room.members.map((member, i) => (
                            <Avatar key={i} className="w-8 h-8 border-2 border-card">
                              <AvatarFallback className="bg-muted text-xs">{member}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <span className="hover:text-foreground transition-colors">Moodboard</span>
                          <span className="hover:text-foreground transition-colors">Outfits</span>
                          <span className="hover:text-foreground transition-colors">Packing List</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all text-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
