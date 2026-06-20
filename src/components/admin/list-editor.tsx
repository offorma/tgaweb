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
  ArrowUpDown,
  Search,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

export type FieldDef =
  | {
      name: string;
      label: string;
      type: "text" | "textarea" | "number" | "select" | "date" | "checkbox" | "image" | "file";
      required?: boolean;
      placeholder?: string;
      helpText?: string;
      options?: { value: string; label: string }[];
      maxLength?: number;
      rows?: number;
    };

export interface ListEditorProps {
  endpoint: string; // e.g. "/api/admin/programs"
  title: string;
  entityName: string; // e.g. "Program"
  fields: FieldDef[];
  // Render a card for each item in the list
  renderCard: (item: any) => { title: string; subtitle?: string; badge?: string; image?: string };
  // Default values when creating new
  defaultValues: Record<string, any>;
  // Pre-fill new item order field
  initialOrder?: number;
}

export function ListEditor(props: ListEditorProps) {
  const { endpoint, title, entityName, fields, renderCard, defaultValues, initialOrder = 0 } = props;
  const { toast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      toast({
        title: "Load failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditing({ ...defaultValues, order: initialOrder, _isNew: true });
    setCreating(true);
  };

  const handleEdit = (item: any) => {
    setEditing({ ...item, _isNew: false });
    setCreating(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (!editing) return;

    // Transform data for API (convert dates, numbers, booleans)
    const payload: Record<string, any> = {};
    for (const f of fields) {
      const v = formData[f.name];
      if (v === undefined || v === "") {
        if (f.type === "number") payload[f.name] = 0;
        else if (f.type === "checkbox") payload[f.name] = false;
        else if (!f.required) payload[f.name] = "";
        else throw new Error(`${f.label} is required`);
        continue;
      }
      if (f.type === "number") payload[f.name] = Number(v);
      else if (f.type === "checkbox") payload[f.name] = Boolean(v);
      else if (f.type === "date") {
        // Convert to ISO string for transport
        payload[f.name] = new Date(v).toISOString();
      } else payload[f.name] = v;
    }

    const isNew = editing._isNew;
    const url = isNew ? endpoint : `${endpoint}/${editing.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (${res.status})`);
    }

    toast({
      title: isNew ? `${entityName} created` : `${entityName} updated`,
      description: "Changes are now live on the website.",
    });
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${endpoint}/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Delete failed");
      }
      toast({
        title: `${entityName} deleted`,
      });
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  // Filter items by search
  const filtered = items.filter((item) => {
    if (!search) return true;
    const card = renderCard(item);
    const text = `${card.title} ${card.subtitle || ""} ${card.badge || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${entityName.toLowerCase()}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleCreate} className="bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add {entityName}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-black/10">
          <div className="text-muted-foreground">
            {search ? "No matches found." : `No ${entityName.toLowerCase()}s yet. Click "Add ${entityName}" to create one.`}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const card = renderCard(item);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                {card.image && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full object-cover"
                    />
                    {card.badge && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-[var(--orange)]/90 text-white hover:bg-[var(--orange)]">
                          {card.badge}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  {!card.image && card.badge && (
                    <Badge className="mb-2 bg-[var(--orange)]/10 text-[var(--orange-dark)] hover:bg-[var(--orange)]/15">
                      {card.badge}
                    </Badge>
                  )}
                  <h3 className="font-serif font-bold text-[var(--navy)] line-clamp-1">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {card.subtitle}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Order: {item.order ?? 0}
                    </span>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[var(--navy)] text-white">Edit this {entityName.toLowerCase()}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-red-600 text-white">Delete this {entityName.toLowerCase()}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?._isNew ? `Add New ${entityName}` : `Edit ${entityName}`}
            </DialogTitle>
            <DialogDescription>
              Changes are saved to the live website immediately.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <EditForm
              key={editing.id || "new"}
              fields={fields}
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
            <AlertDialogTitle>Delete this {entityName.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {renderCard(deleteTarget || {}).title}
              </span>{" "}
              from the live website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

function EditForm({
  fields,
  values,
  onSave,
  onCancel,
}: {
  fields: FieldDef[];
  values: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const f of fields) {
      let v = values[f.name];
      if (f.type === "date" && v) {
        // Convert ISO to YYYY-MM-DD for input
        try {
          v = new Date(v).toISOString().split("T")[0];
        } catch {
          v = "";
        }
      }
      initial[f.name] = v ?? (f.type === "checkbox" ? false : "");
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div
            key={f.name}
            className={f.type === "textarea" ? "sm:col-span-2" : ""}
          >
            <Label htmlFor={f.name} className="text-xs font-semibold">
              {f.label}
              {f.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            {f.helpText && (
              <p className="text-xs text-muted-foreground mb-1.5">{f.helpText}</p>
            )}

            {f.type === "text" && (
              <Input
                id={f.name}
                value={formData[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
                maxLength={f.maxLength}
              />
            )}

            {f.type === "number" && (
              <Input
                id={f.name}
                type="number"
                value={formData[f.name] ?? 0}
                onChange={(e) => update(f.name, Number(e.target.value))}
                required={f.required}
              />
            )}

            {f.type === "date" && (
              <Input
                id={f.name}
                type="date"
                value={formData[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                required={f.required}
              />
            )}

            {f.type === "textarea" && (
              <Textarea
                id={f.name}
                value={formData[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
                maxLength={f.maxLength}
                rows={f.rows ?? 4}
                className="resize-y"
              />
            )}

            {f.type === "select" && (
              <select
                id={f.name}
                value={formData[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                required={f.required}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">Select...</option>
                {f.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {f.type === "checkbox" && (
              <label className="flex items-center gap-2 h-10">
                <input
                  id={f.name}
                  type="checkbox"
                  checked={!!formData[f.name]}
                  onChange={(e) => update(f.name, e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Yes</span>
              </label>
            )}

            {f.type === "image" && (
              <ImageUploadField
                id={f.name}
                value={formData[f.name] ?? ""}
                onChange={(url) => update(f.name, url)}
                required={f.required}
              />
            )}

            {f.type === "file" && (
              <FileUploadField
                id={f.name}
                value={formData[f.name] ?? ""}
                onChange={(url, meta) => {
                  update(f.name, url);
                  if (meta?.fileType) update("fileType", meta.fileType);
                  if (meta?.fileSize) update("fileSize", meta.fileSize);
                }}
                required={f.required}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
