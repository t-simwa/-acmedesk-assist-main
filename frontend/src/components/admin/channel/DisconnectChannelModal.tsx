import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, X, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DisconnectChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: {
    id: string;
    name: string;
    icon: React.ReactNode;
    connectedInfo: string;
  };
  onConfirm: () => Promise<void>;
}

export function DisconnectChannelModal({
  open,
  onOpenChange,
  channel,
  onConfirm,
}: DisconnectChannelModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast({
        title: `${channel.name} disconnected`,
        description: `Your ${channel.name} channel has been disconnected. You can reconnect anytime.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: "There was an error disconnecting the channel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Disconnect {channel.name}?
          </DialogTitle>
          <DialogDescription className="mt-2">
            This will affect your channel connection. Please review the impact below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 bg-red-500/5 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
              This will:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>Stop your AI from receiving {channel.name} messages</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>Stop your AI from sending {channel.name} replies</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Preserve all existing conversation history</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>NOT delete any contacts or leads captured on {channel.name}</span>
              </li>
            </ul>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Current connection:</strong> {channel.connectedInfo}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            You can reconnect {channel.name} at any time from the Channels page.
          </p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Disconnect {channel.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
