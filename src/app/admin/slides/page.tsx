"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
  Search,
  GripVertical,
  Eye,
  EyeOff,
  Video,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/shell";
import { HelpTip } from "@/components/admin/help-tip";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SlidePreview } from "@/components/admin/slide-preview";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

type Slide = {
  id: string;
  image: string;
  videoUrl: string | null;
  title: string;
  subtitle: string | null;
  badge: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  transitionType: string;
  duration: number;
  textPosition: string;
  parallaxDepth: number;
  active: boolean;
  order: number;
};

const TRANSITION_OPTIONS = [
  { value: "fade", label: "Fade (smooth crossfade)" },
  { value: "slide", label: "Slide (horizontal pan)" },
  { value: "zoom", label: "Zoom (dramatic scale)" },
  { value: "curtain", label: "Curtain (center reveal)" },
];

const TEXT_POSITION_OPTIONS = [
  { value: "left", label: "Left (with crest on right)" },
  { value: "center", label: "Center (full-width, no crest)" },
  { value: "right", label: "Right (text aligned right)" },
];

export default function AdminSlidesPage() {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Slide | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Slide | null>(null);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slides");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSlides(data.items || []);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSlides((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });

    // Persist new order
    setReordering(true);
    try {
      const newOrder = [...slides];
      const oldIndex = newOrder.findIndex((i) => i.id === active.id);
      const newIndex = newOrder.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(newOrder, oldIndex, newIndex);
      const ids = reordered.map((s) => s.id);

      const res = await fetch("/api/admin/slides/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      toast({ title: "Slide order saved", description: "New order is now live." });
    } catch (e: any) {
      toast({ title: "Reorder failed", description: e.message, variant: "destructive" });
      await load(); // reload to restore correct order
    } finally {
      setReordering(false);
    }
  };

  const handleCreate = () => {
    setEditing({
      id: "",
      image: "/images/",
      videoUrl: "",
      title: "",
      subtitle: "",
      badge: "",
      linkUrl: "",
      linkLabel: "",
      transitionType: "fade",
      duration: 6500,
      textPosition: "left",
      parallaxDepth: 15,
      active: true,
      order: slides.length,
      _isNew: true,
    } as any);
    setCreating(true);
  };

  const handleEdit = (s: Slide) => {
    setEditing({ ...s, _isNew: false } as any);
    setCreating(true);
  };

  const handleSave = async (formData: any) => {
    if (!editing) return;
    const isNew = (editing as any)._isNew;
    const url = isNew ? "/api/admin/slides" : `/api/admin/slides/${editing.id}`;
    const method = isNew ? "POST" : "PUT";
    const payload: any = {
      image: formData.image,
      videoUrl: formData.videoUrl || undefined,
      title: formData.title,
      subtitle: formData.subtitle || undefined,
      badge: formData.badge || undefined,
      linkUrl: formData.linkUrl || undefined,
      linkLabel: formData.linkLabel || undefined,
      transitionType: formData.transitionType,
      duration: Number(formData.duration),
      textPosition: formData.textPosition,
      parallaxDepth: Number(formData.parallaxDepth),
      active: formData.active,
      order: formData.order,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (${res.status})`);
    }
    toast({ title: isNew ? "Slide created" : "Slide updated" });
    setEditing(null);
    setCreating(false);
    await load();
  };

  const filtered = slides.filter((s) => {
    if (!search) return true;
    const text = `${s.title} ${s.subtitle || ""} ${s.badge || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <>
      <AdminPageHeader
        title="Hero Slides"
        description="Manage the background slideshow on the homepage hero. Drag slides to reorder. Choose transition types and add video backgrounds."
        action={
          <Button onClick={handleCreate} className="bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Slide
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search slides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          <span>Drag to reorder</span>
          <HelpTip content="Click and drag any slide card up or down to change the order. The new order is saved automatically." />
        </div>
        {reordering && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--orange-dark)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving order...</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-black/10">
          <div className="text-muted-foreground mb-4">
            {search ? "No slides found." : 'No slides yet. Click "Add Slide" to create one.'}
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {filtered.map((slide, index) => (
                <SortableSlideCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  onEdit={() => handleEdit(slide)}
                  onDelete={() => setDeleteTarget(slide)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Editor dialog */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editing as any)?._isNew ? "Add New Slide" : "Edit Slide"}</DialogTitle>
            <DialogDescription>
              Configure the background image/video, text content, CTA button, and transition effect.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <SlideEditForm
              key={editing.id || "new"}
              values={editing}
              onSave={handleSave}
              onCancel={() => { setEditing(null); setCreating(false); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.title}</strong> from the slideshow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                const res = await fetch(`/api/admin/slides/${deleteTarget.id}`, { method: "DELETE" });
                if (!res.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
                toast({ title: "Slide deleted" });
                setDeleteTarget(null);
                await load();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============ Sortable Slide Card ============

function SortableSlideCard({
  slide,
  index,
  onEdit,
  onDelete,
}: {
  slide: Slide;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const [showPreview, setShowPreview] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden ${isDragging ? "shadow-2xl ring-2 ring-[var(--orange)]/40" : ""}`}>
      <div className="flex items-stretch">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-10 bg-[var(--cream)] cursor-grab active:cursor-grabbing hover:bg-[var(--orange)]/10 transition-colors flex-shrink-0"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Thumbnail */}
        <div className="relative w-32 h-20 sm:w-40 sm:h-24 flex-shrink-0 overflow-hidden bg-muted">
          <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
          {slide.videoUrl && (
            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
              <Video className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-muted-foreground bg-[var(--cream)] px-1.5 py-0.5 rounded">
                  #{index + 1}
                </span>
                <Badge className={`text-[10px] ${slide.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}`}>
                  {slide.active ? "Active" : "Hidden"}
                </Badge>
                <Badge className="text-[10px] bg-[var(--navy)]/10 text-[var(--navy)] hover:bg-[var(--navy)]/15">
                  {slide.transitionType}
                </Badge>
                <Badge className="text-[10px] bg-[var(--orange)]/10 text-[var(--orange-dark)] hover:bg-[var(--orange)]/15">
                  {(slide.duration / 1000).toFixed(1)}s
                </Badge>
                <Badge className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-100 capitalize">
                  {slide.textPosition}
                </Badge>
                {slide.videoUrl && (
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <Video className="h-2.5 w-2.5 mr-0.5" /> Video
                  </Badge>
                )}
              </div>
              <h3 className="font-serif font-bold text-[var(--navy)] text-sm line-clamp-1">
                {slide.title || "Untitled"}
              </h3>
              {slide.subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{slide.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${showPreview ? "bg-[var(--orange)]/10 text-[var(--orange-dark)]" : ""}`} onClick={() => setShowPreview(!showPreview)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--navy)] text-white">{showPreview ? "Hide preview" : "Show preview"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--navy)] text-white">Edit this slide</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-red-600 text-white">Delete this slide</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Inline preview — expands when Eye button is clicked */}
      {showPreview && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-black/5 bg-[var(--cream)] p-3"
        >
          <SlidePreview slide={slide} />
        </motion.div>
      )}
    </div>
  );
}

// ============ Slide Edit Form ============

function SlideEditForm({
  values,
  onSave,
  onCancel,
}: {
  values: Slide & { _isNew?: boolean };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    image: values.image,
    videoUrl: values.videoUrl || "",
    title: values.title,
    subtitle: values.subtitle || "",
    badge: values.badge || "",
    linkUrl: values.linkUrl || "",
    linkLabel: values.linkLabel || "",
    transitionType: values.transitionType || "fade",
    duration: values.duration || 6500,
    textPosition: values.textPosition || "left",
    parallaxDepth: values.parallaxDepth ?? 15,
    active: values.active,
    order: values.order,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(formData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live preview — updates in real-time as fields are edited */}
      <div className="rounded-xl overflow-hidden border border-black/10 bg-[var(--cream)] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--orange)]" />
          <span className="text-xs font-bold text-[var(--navy)]">Live Preview</span>
          <span className="text-[10px] text-muted-foreground">— this is how the slide will appear on the homepage</span>
        </div>
        <SlidePreview
          slide={{
            image: formData.image,
            videoUrl: formData.videoUrl,
            title: formData.title,
            subtitle: formData.subtitle,
            badge: formData.badge,
            linkLabel: formData.linkLabel,
            linkUrl: formData.linkUrl,
            textPosition: formData.textPosition,
            transitionType: formData.transitionType,
          }}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold flex items-center gap-1">
            Background Image *
            <HelpTip content="Wide landscape image (16:9 or wider). Used as the slide background and as the video poster image. Upload or paste an image URL." />
          </Label>
          <div className="mt-1.5">
            <ImageUploadField
              value={formData.image}
              onChange={(url) => update("image", url)}
              required
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold flex items-center gap-1">
            Video URL (optional — overrides image)
            <HelpTip content="If set, a video will play as the slide background instead of the image. The image is used as the video poster. Use /videos/filename.mp4 or an https URL. Video must be muted (autoplay requires it)." />
          </Label>
          <Input
            value={formData.videoUrl}
            onChange={(e) => update("videoUrl", e.target.value)}
            className="mt-1.5"
            placeholder="/videos/campus-tour.mp4 (leave blank for image only)"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Badge Text (optional)
            <HelpTip content="Small orange pill at the top of the slide. E.g. 'Admissions Open 2026/2027'." />
          </Label>
          <Input
            value={formData.badge}
            onChange={(e) => update("badge", e.target.value)}
            className="mt-1.5"
            placeholder="Admissions Open 2026/2027"
            maxLength={100}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Slide Title *
            <HelpTip content="The large headline text. Keep it short — 1-2 lines max." />
          </Label>
          <Input
            value={formData.title}
            onChange={(e) => update("title", e.target.value)}
            required
            className="mt-1.5"
            placeholder="Where Young Minds Glide Beyond Limits"
            maxLength={120}
          />
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold flex items-center gap-1">
            Subtitle / Description (optional)
            <HelpTip content="Paragraph text below the title. 1-2 sentences recommended." />
          </Label>
          <Textarea
            value={formData.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            rows={2}
            className="mt-1.5 resize-y"
            placeholder="Short description shown below the title"
            maxLength={300}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Button Label (optional)
            <HelpTip content="Text on the CTA button. E.g. 'Begin Your Application'." />
          </Label>
          <Input
            value={formData.linkLabel}
            onChange={(e) => update("linkLabel", e.target.value)}
            className="mt-1.5"
            placeholder="Begin Your Application"
            maxLength={50}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Button Link (optional)
            <HelpTip content="Where the button goes. Use #admissions for in-page scroll, or https://... for external URL." />
          </Label>
          <Input
            value={formData.linkUrl}
            onChange={(e) => update("linkUrl", e.target.value)}
            className="mt-1.5"
            placeholder="#admissions or https://..."
            maxLength={500}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Transition Type
            <HelpTip content="How this slide enters: Fade = smooth crossfade. Slide = horizontal pan. Zoom = dramatic scale-up. Curtain = center-out reveal." />
          </Label>
          <select
            value={formData.transitionType}
            onChange={(e) => update("transitionType", e.target.value)}
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TRANSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Slide Duration (ms)
            <HelpTip content="How long this slide stays visible before advancing. Range: 2000-30000ms. Default: 6500ms (6.5s). Longer for slides with more text." />
          </Label>
          <Input
            type="number"
            min={2000}
            max={30000}
            step={500}
            value={formData.duration}
            onChange={(e) => update("duration", Number(e.target.value))}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1">{(formData.duration / 1000).toFixed(1)}s per slide</p>
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Text Position
            <HelpTip content="Where the text content appears: Left = text on left with crest on right (default). Center = full-width centered text, no crest. Right = text aligned to the right." />
          </Label>
          <select
            value={formData.textPosition}
            onChange={(e) => update("textPosition", e.target.value)}
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TEXT_POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Parallax Depth
            <HelpTip content="How much the background image shifts during the Ken Burns effect + scroll parallax. 0 = no movement, 50 = dramatic. Default: 15. Higher values = more cinematic but can be distracting." />
          </Label>
          <Input
            type="number"
            min={0}
            max={50}
            value={formData.parallaxDepth}
            onChange={(e) => update("parallaxDepth", Number(e.target.value))}
            className="mt-1.5"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--gold)] transition-all"
                style={{ width: `${(formData.parallaxDepth / 50) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-20">
              {formData.parallaxDepth === 0 ? "None" : formData.parallaxDepth < 20 ? "Subtle" : formData.parallaxDepth < 35 ? "Moderate" : "Dramatic"}
            </span>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            Display Order
            <HelpTip content="Lower numbers appear first. You can also drag-and-drop slides on the main page to reorder." />
          </Label>
          <Input
            type="number"
            value={formData.order}
            onChange={(e) => update("order", Number(e.target.value))}
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-[var(--cream)] rounded-lg">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => update("active", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <div>
              <div className="text-sm font-semibold flex items-center gap-1">
                {formData.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {formData.active ? "Active (shown on site)" : "Hidden (not shown)"}
              </div>
              <div className="text-xs text-muted-foreground">Toggle off to hide without deleting.</div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white">
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-1.5" />Save Slide</>
          )}
        </Button>
      </div>
    </form>
  );
}
