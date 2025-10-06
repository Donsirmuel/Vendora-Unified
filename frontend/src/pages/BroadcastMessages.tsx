import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, MessageSquare, Calendar, Trash2, Megaphone, Sparkles, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createBroadcast, listBroadcasts, sendBroadcast, deleteBroadcast, BroadcastMessage } from "@/lib/broadcast";
import BrandedEmptyState from "@/components/BrandedEmptyState";

const BroadcastMessages = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'asset_added' | 'rate_updated' | 'order_status' | 'general'>('general');
  const [isSending, setIsSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadBroadcasts = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      const response = await listBroadcasts(targetPage);
      if (targetPage === 1) {
        setBroadcasts(response.results);
      } else {
        setBroadcasts(prev => [...prev, ...response.results]);
      }
      setHasMore(!!response.next);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load broadcasts",
        className: "bg-destructive text-destructive-foreground"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBroadcasts(page).catch(() => {});
  }, [page, loadBroadcasts]);

  const handleSendBroadcast = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Required Fields",
        description: "Please enter both title and message content.",
        className: "bg-warning text-warning-foreground"
      });
      return;
    }

    setIsSending(true);
    try {
      // Create the broadcast
      const newBroadcast = await createBroadcast({
        title: title.trim(),
        content: content.trim(),
        message_type: messageType
      });

      // Send it to the bot
      const sendResult = await sendBroadcast(newBroadcast.id);
      
      if (sendResult.success) {
        toast({
          title: "Broadcast Sent",
          description: "Your message has been sent to all customers successfully.",
          className: "bg-success text-success-foreground"
        });
        
        // Reset form
        setTitle("");
        setMessage("");
        setMessageType('general');
        
        // Reload broadcasts
        setPage(1);
  await loadBroadcasts(1);
      } else {
        toast({
          title: "Send Failed",
          description: sendResult.error || "Failed to send broadcast to customers",
          className: "bg-destructive text-destructive-foreground"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create or send broadcast",
        className: "bg-destructive text-destructive-foreground"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: number) => {
    try {
      await deleteBroadcast(id);
      toast({
        title: "Deleted",
        description: "Broadcast message deleted successfully",
        className: "bg-success text-success-foreground"
      });
      setPage(1);
  await loadBroadcasts(1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete broadcast",
        className: "bg-destructive text-destructive-foreground"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (isSent: boolean) => {
    return isSent ? (
      <Badge className="bg-success/20 text-success">Sent</Badge>
    ) : (
      <Badge className="bg-warning/20 text-warning">Pending</Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/20 px-8 py-10 text-white shadow-xl shadow-primary/20">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 uppercase tracking-[0.3em] text-xs text-primary/80">
                Customer Broadcasts
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold md:text-4xl">Vendora Broadcast Studio</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Ship real-time alerts, price updates, and availability news to every buyer in one polished, vendor-branded feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                  <Link to="/settings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Settings
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  <Link to="/availability">
                    <Clock className="mr-2 h-4 w-4" />
                    Update Availability
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-100 md:max-w-xs">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-base font-semibold text-white">Stay top-of-mind</p>
              <p className="text-xs text-slate-200/80">
                Every broadcast drops straight into your Telegram bot so buyers see your latest promo, rates, or downtime instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Send Broadcast */}
  <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Send Broadcast Message</span>
            </CardTitle>
            <CardDescription>
              Deliver polished announcements the moment buyers open your Vendora Telegram bot. Draft, tag, and send in one motion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter message title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background border-border"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Message Type</Label>
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="asset_added">Asset Added</SelectItem>
                    <SelectItem value="rate_updated">Rate Updated</SelectItem>
                    <SelectItem value="order_status">Order Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                placeholder="Type your broadcast message here..."
                value={content}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="bg-background border-border resize-none"
                maxLength={500}
              />
              <p className="text-sm text-muted-foreground text-right">
                {content.length}/500 characters
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleSendBroadcast}
                disabled={isSending || !title.trim() || !content.trim()}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send Broadcast"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Broadcast History */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Broadcast History</span>
            </CardTitle>
            <CardDescription>
              Track campaign reach, resend favourites, and celebrate the messages that move your desk forward.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {broadcasts.length > 0 ? (
              <div className="space-y-4">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="border border-border rounded-lg p-4 bg-secondary/20">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{formatDate(broadcast.created_at)}</span>
                        <Badge variant="outline" className="text-xs">
                          {broadcast.message_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(broadcast.is_sent)}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-medium mb-2">{broadcast.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{broadcast.content}</p>
                  </div>
                ))}
                
                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-border"
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={isLoading}
                    >
                      {isLoading ? "Loading..." : "Load More Messages"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <BrandedEmptyState
                icon={Megaphone}
                badge="Let them know"
                title="Announce your next move"
                description="Keep buyers excited with an availability drop, promo, or rate change. Your first broadcast primes the bot for every future update."
                actions={
                  <Button
                    onClick={handleSendBroadcast}
                    disabled={isSending || !title.trim() || !content.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? "Sending..." : "Send your first broadcast"}
                  </Button>
                }
                className="bg-slate-950"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BroadcastMessages;