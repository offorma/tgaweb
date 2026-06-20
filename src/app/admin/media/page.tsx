"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/shell";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface MediaItem {
  publicId: string;
  url: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileName(publicId: string) {
  const parts = publicId.split("/");
  return parts[parts.length - 1];
}

export default function AdminMediaPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "raw">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?type=${filter}`);
      if (!res.ok) throw new Error("Failed to load media");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: deleteTarget.publicId,
          resourceType: deleteTarget.resourceType,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setItems((prev) => prev.filter((i) => i.publicId !== deleteTarget.publicId));
      toast({ title: "Deleted", description: `${getFileName(deleteTarget.publicId)} removed from Cloudinary.` });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const copyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.publicId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = items.filter((item) => {
    const name = getFileName(item.publicId).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <>
      <AdminPageHeader
        title="Media Library"
        description="View and manage all files uploaded to Cloudinary. Copy URLs or delete files you no longer need."
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "image", "raw"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white" : ""}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Documents"}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>{search ? "No files match your search" : "No files uploaded yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const isImage = item.resourceType === "image";
              const fileName = getFileName(item.publicId);
              return (
                <motion.div
                  key={item.publicId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative rounded-lg border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Preview */}
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {isImage ? (
                      <img
                        src={item.url}
                        alt={fileName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-medium truncate" title={fileName}>
                      {fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.format?.toUpperCase() || "FILE"} &bull; {formatBytes(item.bytes)}
                      {item.width ? ` &bull; ${item.width}×${item.height}` : ""}
                    </p>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => copyUrl(item)}
                        >
                          {copiedId === item.publicId ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy URL</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="secondary" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Open in new tab</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete from Cloudinary</TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from Cloudinary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget ? getFileName(deleteTarget.publicId) : ""}</strong>{" "}
              from Cloudinary. Any pages still referencing this file will show a broken link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
