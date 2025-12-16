import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Edit, ExternalLink, Copy, MoreVertical, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedShareLink } from "@shared/schema";

interface SavedLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedLinksModal({ open, onOpenChange }: SavedLinksModalProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<SavedShareLink | null>(null);
  const [remark, setRemark] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: savedLinks = [], isLoading } = useQuery<SavedShareLink[]>({
    queryKey: ["/api/saved-share-links"],
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/saved-share-links/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete saved link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-share-links"] });
      setDeleteDialogOpen(false);
      setSelectedLink(null);
      toast({
        title: "Link deleted",
        description: "The saved link has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete saved link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateRemarkMutation = useMutation({
    mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
      const response = await apiRequest("PATCH", `/api/saved-share-links/${id}/remark`, {
        remark,
      });
      if (!response.ok) {
        throw new Error("Failed to update remark");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-share-links"] });
      setEditDialogOpen(false);
      setSelectedLink(null);
      setRemark("");
      toast({
        title: "Remark updated",
        description: "The link remark has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update remark. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (link: SavedShareLink) => {
    setSelectedLink(link);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (link: SavedShareLink) => {
    setSelectedLink(link);
    setRemark(link.remark);
    setEditDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLink) {
      deleteMutation.mutate(selectedLink.id);
    }
  };

  const saveRemark = () => {
    if (selectedLink) {
      updateRemarkMutation.mutate({ id: selectedLink.id, remark });
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter saved links based on search query
  const filteredLinks = savedLinks.filter((link) => {
    const query = searchQuery.toLowerCase();
    return (
      link.remark.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      formatDate(link.createdAt).toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] animate-in zoom-in-95 duration-300 data-[state=closed]:animate-out data-[state=closed]:zoom-out-90 bg-white/70 dark:bg-black/30 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_60px_0_rgba(0,0,0,0.25)] rounded-3xl">
          {/* Enhanced Premium Frosted Glass Layer */}
          <div 
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/70 via-white/50 to-white/60 dark:from-black/50 dark:via-black/30 dark:to-black/40 border-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]" 
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            {/* Subtle top shine effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 dark:from-blue-400/10 dark:via-transparent dark:to-purple-400/10" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Saved Share Links
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              Manage your saved share links. Add remarks to organize them better.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search by remark, URL, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200/60 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 dark:text-gray-300 dark:placeholder:text-gray-500"
              data-testid="input-search-links"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Loading saved links...</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? "No links found matching your search" : "No saved links yet"}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="rounded-lg dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((link) => (
                  <div
                    key={link.id}
                    className="group p-4 rounded-xl border-2 border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-black/60 hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in zoom-in-95"
                    data-testid={`saved-link-${link.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {link.remark || "Untitled Link"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                          <span className="inline-block w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                          {formatDate(link.createdAt)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0 rounded-lg transition-all duration-300 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-950/50 active:scale-95"
                            data-testid={`button-actions-${link.id}`}
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border-2 border-gray-200/60 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-xl">
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(link.url)}
                            className="cursor-pointer rounded-lg transition-all duration-200 hover:scale-[1.02] focus:bg-blue-50 dark:focus:bg-blue-950/50 dark:text-gray-300"
                            data-testid={`menu-copy-${link.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                            <span className="dark:text-gray-300">Copy Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(link.url, "_blank")}
                            className="cursor-pointer rounded-lg transition-all duration-200 hover:scale-[1.02] focus:bg-green-50 dark:focus:bg-green-950/50 dark:text-gray-300"
                            data-testid={`menu-open-${link.id}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                            <span className="dark:text-gray-300">Open Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(link)}
                            className="cursor-pointer rounded-lg transition-all duration-200 hover:scale-[1.02] focus:bg-amber-50 dark:focus:bg-amber-950/50 dark:text-gray-300"
                            data-testid={`menu-edit-${link.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
                            <span className="dark:text-gray-300">Edit Remark</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(link)}
                            className="cursor-pointer rounded-lg text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 transition-all duration-200 hover:scale-[1.02]"
                            data-testid={`menu-delete-${link.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                            <span>Delete Link</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={link.url}
                        readOnly
                        className="flex-1 h-9 text-xs rounded-lg bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 font-mono text-gray-600 dark:text-gray-300"
                        data-testid={`input-url-${link.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/70 dark:bg-black/30 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_60px_0_rgba(0,0,0,0.25)] rounded-3xl">
          {/* Enhanced Premium Frosted Glass Layer */}
          <div 
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/70 via-white/50 to-white/60 dark:from-black/50 dark:via-black/30 dark:to-black/40 border-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]" 
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            {/* Subtle top shine effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-red-500/5 via-transparent to-orange-500/5 dark:from-red-400/10 dark:via-transparent dark:to-orange-400/10" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
              Delete Saved Link
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Are you sure you want to delete this saved link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Remark Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white/70 dark:bg-black/30 backdrop-blur-2xl border-2 border-gray-200/60 dark:border-white/10 shadow-[0_20px_60px_0_rgba(0,0,0,0.25)] rounded-3xl">
          {/* Enhanced Premium Frosted Glass Layer */}
          <div 
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/70 via-white/50 to-white/60 dark:from-black/50 dark:via-black/30 dark:to-black/40 border-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)]" 
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            {/* Subtle top shine effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-green-500/5 via-transparent to-blue-500/5 dark:from-green-400/10 dark:via-transparent dark:to-blue-400/10" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
              Edit Link Remark
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              Add a note to help you remember what this link is for.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="remark" className="text-sm font-medium dark:text-gray-300">Remark</Label>
            <Input
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g., Weekly sales report - Jan 2024"
              className="mt-2 rounded-lg bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200/60 dark:border-white/10 focus:border-blue-400 dark:focus:border-blue-500 dark:text-gray-300 dark:placeholder:text-gray-500"
              data-testid="input-remark"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-lg dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800">
              Cancel
            </Button>
            <Button
              onClick={saveRemark}
              disabled={updateRemarkMutation.isPending}
              className="rounded-lg bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
              data-testid="button-save-remark"
            >
              {updateRemarkMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
