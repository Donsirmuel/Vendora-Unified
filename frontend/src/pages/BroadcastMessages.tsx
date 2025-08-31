import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, MessageSquare, Calendar, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createBroadcast, listBroadcasts, sendBroadcast, deleteBroadcast, BroadcastMessage } from "@/lib/broadcast";
import { useAuth } from "@/contexts/AuthContext";

const BroadcastMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'asset_added' | 'rate_updated' | 'order_status' | 'general'>('general');
  const [isSending, setIsSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadBroadcasts();
  }, [page]);

  const loadBroadcasts = async () => {
    try {
      setIsLoading(true);
      const response = await listBroadcasts(page);
      if (page === 1) {
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
  };

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
        await loadBroadcasts();
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
      await loadBroadcasts();
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
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link to="/settings">
            <Button variant="outline" size="sm" className="border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Broadcast Messages</h1>
            <p className="text-muted-foreground">Send messages to all your customers</p>
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
              Send a message to all your customers. This will be visible to them when they interact with your services.
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
              View your previously sent broadcast messages
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
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No broadcast messages sent yet</p>
                <p className="text-sm">Send your first broadcast message above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BroadcastMessages;