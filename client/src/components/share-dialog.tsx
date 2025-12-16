import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableState: {
    filters: {
      searchTerm: string;
      routeFilters: string[];
      deliveryFilters: string[];
    };
    sorting: {
      column: string;
      direction: 'asc' | 'desc';
    } | null;
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
  };
}

export function ShareDialog({ open, onOpenChange, tableState }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareId, setShareId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateShareUrl = async () => {
    setIsGenerating(true);
    try {
      // Generate a unique 6-character share ID
      const generatedShareId = Math.random().toString(36).substring(2, 8);
      
      // Create shared state via API
      const response = await apiRequest("POST", "/api/share-table", {
        shareId: generatedShareId,
        tableState,
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      // Generate the shareable URL
      const url = `${window.location.origin}/share/${generatedShareId}`;
      setShareUrl(url);
      setShareId(generatedShareId);
      
      toast({
        title: "Share link created",
        description: "Your table view has been saved and can now be shared.",
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({
        title: "Error",
        description: "Failed to create share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveShareLink = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/saved-share-links", {
        shareId,
        url: shareUrl,
        remark: "",
      });

      if (!response.ok) {
        throw new Error("Failed to save share link");
      }

      setIsSaved(true);
      
      // Invalidate saved links query to auto-refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/saved-share-links"] });
      
      toast({
        title: "Link saved!",
        description: "Share link has been added to your saved links.",
      });
    } catch (error) {
      console.error("Error saving share link:", error);
      toast({
        title: "Error",
        description: "Failed to save share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setShareUrl("");
      setShareId("");
      setCopied(false);
      setIsSaved(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="w-[90vw] max-w-md sm:max-w-lg animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-90 duration-300 transition-all bg-white/70 dark:bg-black/30 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_60px_0_rgba(0,0,0,0.25)]"
        style={{
          maxHeight: 'min(80vh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px))',
          touchAction: 'pan-y',
        }}
      >
        {/* iOS Frosted Glass Layer */}
        <div 
          className="absolute inset-0 -z-10 bg-gradient-to-br from-white/60 via-white/40 to-white/50 dark:from-black/40 dark:via-black/20 dark:to-black/30 border-0 shadow-inner" 
          style={{
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        />
        
        <DialogHeader 
          className="relative z-10"
          style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
        >
          <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Share Table View</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
            Create a shareable link for the current table state including filters, sorting, and visible columns.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="space-y-4 py-4 relative z-10"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {!shareUrl ? (
            <Button
              onClick={generateShareUrl}
              disabled={isGenerating}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 dark:from-blue-600 dark:to-cyan-600 dark:hover:from-blue-500 dark:hover:to-cyan-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="button-generate-share-link"
            >
              {isGenerating ? "Generating..." : "Generate Share Link"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200/60 dark:border-white/10 text-sm font-mono text-gray-600 dark:text-gray-300"
                  data-testid="input-share-url"
                />
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg border-2 border-gray-200/60 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:scale-110 active:scale-95"
                  data-testid="button-copy-share-link"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  )}
                </Button>
                <Button
                  onClick={saveShareLink}
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg border-2 border-gray-200/60 dark:border-white/10 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 hover:scale-110 active:scale-95"
                  disabled={isSaving || isSaved}
                  data-testid="button-save-share-link"
                  title={isSaved ? "Link saved" : "Save link"}
                >
                  {isSaved ? (
                    <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <Bookmark className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Anyone with this link can view your table with the current filters and settings.
              </p>
            </div>
          )}
        </div>

        <DialogFooter 
          className="relative z-10 sm:justify-center"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-xl border-2 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 text-sm w-full sm:w-auto"
            data-testid="button-cancel-share"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
