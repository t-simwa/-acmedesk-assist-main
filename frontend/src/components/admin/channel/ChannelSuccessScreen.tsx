import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  MessageCircle, 
  Mail, 
  Phone, 
  Instagram, 
  Globe,
  ArrowRight,
  Copy,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChannelSuccessScreenProps {
  channel: {
    id: string;
    name: string;
    icon: "whatsapp" | "email" | "sms" | "instagram" | "messenger" | "widget";
    connectedInfo: string;
    summary: Record<string, string | number>;
    features?: string[];
  };
  onConfigure?: () => void;
  onTestChatbot?: () => void;
}

const CHANNEL_CONFIG = {
  whatsapp: {
    icon: MessageCircle,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    accentColor: "text-emerald-500",
  },
  email: {
    icon: Mail,
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-500/10",
    accentColor: "text-violet-500",
  },
  sms: {
    icon: Phone,
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-500/10",
    accentColor: "text-pink-500",
  },
  instagram: {
    icon: Instagram,
    color: "from-purple-500 via-pink-500 to-orange-400",
    bgColor: "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-400/10",
    accentColor: "text-pink-500",
  },
  messenger: {
    icon: MessageCircle,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    accentColor: "text-blue-500",
  },
  widget: {
    icon: Globe,
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-500/10",
    accentColor: "text-slate-500",
  },
};

export function ChannelSuccessScreen({ 
  channel, 
  onConfigure,
  onTestChatbot,
}: ChannelSuccessScreenProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = CHANNEL_CONFIG[channel.icon];
  const Icon = config.icon;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className={cn(
              "h-24 w-24 rounded-full bg-gradient-to-br flex items-center justify-center animate-in zoom-in duration-500",
              config.color
            )}>
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center animate-in slide-in-from-bottom-2 duration-500 delay-200">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <h1 className="font-heading text-2xl font-bold text-foreground mt-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            {channel.name} is now live!
          </h1>
          <p className="text-muted-foreground mt-2 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            Your AI can now receive and respond to messages on {channel.name}.
          </p>
        </div>
        
        {/* Summary Card */}
        <Card className="mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Connection Summary
            </h3>
            <div className="space-y-3">
              {Object.entries(channel.summary).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            
            {channel.features && channel.features.length > 0 && (
              <>
                <div className="border-t my-4" />
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Active Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  {channel.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="bg-muted/50">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-400">
          {onTestChatbot && (
            <Button 
              variant="outline" 
              className="w-full h-12"
              onClick={onTestChatbot}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Test Chatbot
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          )}
          
          <Button 
            className={cn(
              "w-full h-12",
              !onTestChatbot && "col-span-2"
            )}
            onClick={() => navigate("/dashboard/inbox")}
          >
            <Mail className="h-4 w-4 mr-2" />
            Go to Inbox
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
        
        {/* Share Info */}
        {channel.connectedInfo && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg animate-in slide-in-from-bottom-4 duration-500 delay-500">
            <p className="text-sm text-muted-foreground text-center">
              Share this {channel.id === "whatsapp" ? "number" : "account"} with your customers:
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-sm bg-background px-3 py-2 rounded border truncate">
                {channel.connectedInfo}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleCopy(channel.connectedInfo)}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Customers can start chatting with your AI right away!
            </p>
          </div>
        )}
        
        {/* Configure Link */}
        {onConfigure && (
          <div className="text-center mt-6 animate-in slide-in-from-bottom-4 duration-500 delay-600">
            <Button variant="link" onClick={onConfigure}>
              Configure {channel.name} settings
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
