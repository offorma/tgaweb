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
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Send,
  Mail,
  CreditCard,
  Settings as SettingsIcon,
  Key,
  ShieldCheck,
  ShieldAlert,
  Wand2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/shell";
import { HelpTip } from "@/components/admin/help-tip";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ====== Types ======

type Secret = {
  id: string;
  key: string;
  category: string;
  description: string | null;
  previewHint: string | null;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  byCategory: Record<string, number>;
  lastRotatedAt: string | null;
  masterKeyConfigured: boolean;
};

// ====== Templates — pre-filled common secret bundles ======

const TEMPLATES = [
  {
    id: "smtp",
    label: "SMTP Credentials",
    icon: Mail,
    color: "from-blue-500 to-blue-700",
    secrets: [
      { key: "SMTP_HOST", description: "SMTP server hostname (e.g. smtp.gmail.com)" },
      { key: "SMTP_PORT", description: "SMTP port (587 for TLS, 465 for SSL)" },
      { key: "SMTP_USER", description: "SMTP username (usually your email)" },
      { key: "SMTP_PASSWORD", description: "SMTP password or app-specific password" },
      { key: "SMTP_FROM", description: "From email address (e.g. info@trailgliders.edu.ng)" },
    ],
  },
  {
    id: "paystack",
    label: "Paystack Payment Keys",
    icon: CreditCard,
    color: "from-emerald-500 to-emerald-700",
    secrets: [
      { key: "PAYSTACK_PUBLIC_KEY", description: "Public key (safe to expose)" },
      { key: "PAYSTACK_SECRET_KEY", description: "Secret key (server-side only)" },
      { key: "PAYSTACK_WEBHOOK_SECRET", description: "Webhook signing secret" },
    ],
  },
  {
    id: "flutterwave",
    label: "Flutterwave Keys",
    icon: CreditCard,
    color: "from-orange-500 to-orange-700",
    secrets: [
      { key: "FLW_PUBLIC_KEY", description: "Public key" },
      { key: "FLW_SECRET_KEY", description: "Secret key (server-side only)" },
      { key: "FLW_ENCRYPTION_KEY", description: "Encryption key" },
    ],
  },
  {
    id: "app",
    label: "App Config",
    icon: SettingsIcon,
    color: "from-purple-500 to-purple-700",
    secrets: [
      { key: "NEXTAUTH_SECRET", description: "Random secret for NextAuth JWT signing" },
    ],
  },
  {
    id: "captcha",
    label: "Cloudflare Turnstile (CAPTCHA)",
    icon: ShieldCheck,
    color: "from-cyan-500 to-cyan-700",
    secrets: [
      { key: "TURNSTILE_SITE_KEY", description: "Public site key (shown in browser) — get from Cloudflare dashboard" },
      { key: "TURNSTILE_SECRET_KEY", description: "Secret key (server-side only) — get from Cloudflare dashboard" },
    ],
  },
];

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  app: { label: "App Config", icon: SettingsIcon, color: "text-purple-600" },
  email: { label: "Email / SMTP", icon: Mail, color: "text-blue-600" },
  payment: { label: "Payments", icon: CreditCard, color: "text-emerald-600" },
  sms: { label: "SMS", icon: Send, color: "text-amber-600" },
  storage: { label: "Cloud Storage", icon: Key, color: "text-cyan-600" },
};

// ====== Main page ======

export default function AdminSecretsPage() {
  const { toast } = useToast();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("email");
  const [editing, setEditing] = useState<Secret | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/secrets");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSecrets(data.secrets || []);
      setStats(data.stats || null);
    } catch (e: any) {
      toast({
        title: "Load failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = (preset?: { key?: string; category?: string; description?: string }) => {
    setEditing({
      id: "",
      key: preset?.key || "",
      category: preset?.category || activeCategory,
      description: preset?.description || "",
      previewHint: null,
      lastRotatedAt: null,
      createdAt: "",
      updatedAt: "",
      _isNew: true,
    } as any);
    setCreating(true);
    setShowTemplates(false);
  };

  const handleEdit = (s: Secret) => {
    setEditing({ ...s, _isNew: false });
    setCreating(true);
  };

  const handleSave = async (formData: any) => {
    if (!editing) return;
    const isNew = (editing as any)._isNew;
    const url = isNew ? "/api/admin/secrets" : `/api/admin/secrets/${editing.id}`;
    const method = isNew ? "POST" : "PUT";
    const payload: any = {
      key: formData.key,
      category: formData.category,
      description: formData.description,
    };
    if (formData.value) payload.value = formData.value;

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
      title: isNew ? "Secret created" : "Secret updated",
      description: "Stored encrypted — only the last 4 chars are visible.",
    });
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/secrets/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Secret deleted" });
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Secrets Vault"
        description="Encrypted storage for SMTP, payment gateway, and app credentials. The master key lives in your cPanel environment."
        action={
          <Button
            onClick={() => setShowTemplates(true)}
            className="bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white"
          >
            <Wand2 className="h-4 w-4 mr-1.5" />
            Add from Template
          </Button>
        }
      />

      {/* Status banner */}
      {stats && !stats.masterKeyConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl bg-red-50 border-2 border-red-200 flex items-start gap-3"
        >
          <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">Master key not configured</h3>
            <p className="mt-1 text-sm text-red-800">
              The <code className="bg-red-100 px-1.5 py-0.5 rounded">SECRETS_MASTER_KEY</code> environment variable
              is not set. Add it in <strong>cPanel → Setup Node.js App → Environment Variables</strong> with a
              random value of at least 32 characters. Until then, no secrets can be stored or decrypted.
            </p>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded font-mono">
              SECRETS_MASTER_KEY=generate-a-32-char-random-string-here
            </pre>
          </div>
        </motion.div>
      )}

      {/* Status cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <div className={`flex items-center gap-2 ${stats.masterKeyConfigured ? "text-green-600" : "text-red-600"}`}>
              {stats.masterKeyConfigured ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                Master Key
                <HelpTip content="The SECRETS_MASTER_KEY environment variable encrypts all secrets. Must be set in cPanel → Setup Node.js App → Environment Variables. If missing, no secrets can be stored or decrypted." />
              </span>
            </div>
            <div className="mt-2 font-serif text-xl font-bold text-[var(--navy)]">
              {stats.masterKeyConfigured ? "Active" : "Missing"}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <Key className="h-4 w-4 text-[var(--orange)]" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Total Secrets
              <HelpTip content="Total number of encrypted secrets stored in the vault across all categories." />
            </div>
            <div className="font-serif text-xl font-bold text-[var(--navy)]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <Mail className="h-4 w-4 text-blue-500" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Email/SMTP
              <HelpTip content="Number of SMTP-related secrets (host, port, user, password, from). Used by the contact form to send emails." />
            </div>
            <div className="font-serif text-xl font-bold text-[var(--navy)]">
              {stats.byCategory.email || 0}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Payment Keys
              <HelpTip content="Number of payment gateway secrets (Paystack, Flutterwave). Used for online fee payments." />
            </div>
            <div className="font-serif text-xl font-bold text-[var(--navy)]">
              {stats.byCategory.payment || 0}
            </div>
          </div>
        </div>
      )}

      {/* Tabs by category */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-white border border-black/5 mb-6">
          {Object.entries(CATEGORY_META).map(([id, meta]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="data-[state=active]:bg-[var(--navy)] data-[state=active]:text-white"
            >
              <meta.icon className={`h-3.5 w-3.5 mr-1.5 ${stats?.byCategory[id] ? "" : "opacity-50"}`} />
              {meta.label}
              {stats?.byCategory[id] ? (
                <span className="ml-1.5 text-xs bg-black/10 dark:bg-white/20 px-1.5 rounded-full">
                  {stats.byCategory[id]}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CATEGORY_META).map(([catId, meta]) => {
          const catSecrets = secrets.filter((s) => s.category === catId);
          return (
            <TabsContent key={catId} value={catId}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : catSecrets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-black/10">
                  <meta.icon className={`h-10 w-10 mx-auto mb-3 ${meta.color} opacity-30`} />
                  <div className="text-muted-foreground mb-4">
                    No {meta.label.toLowerCase()} secrets yet.
                  </div>
                  <Button onClick={() => handleCreate({ category: catId })} variant="outline">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add {meta.label} Secret
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catSecrets.map((s) => (
                    <SecretCard
                      key={s.id}
                      secret={s}
                      onEdit={() => handleEdit(s)}
                      onDelete={() => setDeleteTarget(s)}
                    />
                  ))}
                  <button
                    onClick={() => handleCreate({ category: catId })}
                    className="min-h-[140px] border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-[var(--orange)] hover:border-[var(--orange)]/40 hover:bg-[var(--orange)]/5 transition-all"
                  >
                    <Plus className="h-6 w-6 mb-1" />
                    <span className="text-sm font-medium">Add Secret</span>
                  </button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Templates dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add from Template</DialogTitle>
            <DialogDescription>
              Pick a pre-configured bundle of secret keys. You'll be prompted to fill in values one at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleCreate({
                    key: tpl.secrets[0].key,
                    category: tpl.id === "smtp" ? "email" : tpl.id === "app" ? "app" : "payment",
                    description: tpl.secrets[0].description,
                  })}
                  className="text-left p-4 rounded-2xl border border-black/5 hover:border-[var(--orange)]/30 hover:shadow-md transition-all bg-white"
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-[var(--navy)]">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tpl.secrets.length} keys: {tpl.secrets.map(s => s.key).join(", ")}
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => handleCreate()}
              className="text-left p-4 rounded-2xl border-2 border-dashed border-black/10 hover:border-[var(--orange)]/40 hover:bg-[var(--orange)]/5 transition-all bg-white flex flex-col justify-center"
            >
              <Plus className="h-8 w-8 text-[var(--orange)] mb-2" />
              <div className="font-semibold text-[var(--navy)]">Custom Secret</div>
              <div className="text-xs text-muted-foreground mt-1">
                Add a single secret with any key name
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor dialog */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {(editing as any)?._isNew ? "Add Secret" : "Edit Secret"}
            </DialogTitle>
            <DialogDescription>
              The value is encrypted with AES-256-GCM before storage. Only the last 4 characters are visible afterward.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <EditSecretForm
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
            <AlertDialogTitle>Delete this secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.key}</strong> from the vault.
              Any feature relying on it will stop working. This action cannot be undone.
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

// ====== Single secret card ======

function SecretCard({
  secret,
  onEdit,
  onDelete,
}: {
  secret: Secret;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const reveal = async () => {
    setRevealLoading(true);
    try {
      const res = await fetch(`/api/admin/secrets/${secret.id}/reveal`, { method: "POST" });
      if (!res.ok) throw new Error("Reveal failed");
      const data = await res.json();
      setRevealed(data.value);
      toast({
        title: "Secret revealed",
        description: "This action was audit-logged. Copy the value — it will be hidden when you leave this card.",
      });
    } catch (e: any) {
      toast({ title: "Reveal failed", description: e.message, variant: "destructive" });
    } finally {
      setRevealLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const rotate = async () => {
    if (!confirm(`Rotate the value of ${secret.key}?\n\nThis generates a new 40-char random value. The OLD value will stop working immediately. The new value will be shown ONCE for you to copy.`)) {
      return;
    }
    setRotating(true);
    try {
      const res = await fetch(`/api/admin/secrets/${secret.id}/rotate`, { method: "POST" });
      if (!res.ok) throw new Error("Rotation failed");
      const data = await res.json();
      setRevealed(data.value);
      toast({
        title: "Secret rotated",
        description: "New value shown below — copy it now, it won't be shown again.",
      });
    } catch (e: any) {
      toast({ title: "Rotation failed", description: e.message, variant: "destructive" });
    } finally {
      setRotating(false);
    }
  };

  // Hide revealed value when card loses focus / unmounts
  useEffect(() => {
    return () => setRevealed(null);
  }, []);

  const maskedValue = revealed
    ? revealed
    : secret.previewHint
    ? `••••••••••••${secret.previewHint}`
    : "••••••••••••";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <code className="text-xs font-mono font-bold text-[var(--navy)] bg-[var(--cream)] px-1.5 py-0.5 rounded break-all">
              {secret.key}
            </code>
            {secret.description && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                {secret.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 p-2 bg-[var(--cream)] rounded-lg font-mono text-xs text-foreground/80 flex items-center justify-between gap-2">
          <span className="truncate">{maskedValue}</span>
          {revealed ? (
            <button
              onClick={() => setRevealed(null)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Hide"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {secret.lastRotatedAt && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            Last rotated {new Date(secret.lastRotatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => (revealed ? copy(revealed) : reveal())}
            disabled={revealLoading}
          >
            {revealLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : revealed ? (
              copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span className="ml-1 text-xs">{revealed ? "Copy" : "Reveal"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={rotate}
            disabled={rotating}
            title="Generate a new random value"
          >
            {rotating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1 text-xs">Rotate</span>
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ====== Edit form ======

function EditSecretForm({
  values,
  onSave,
  onCancel,
}: {
  values: Secret & { _isNew?: boolean };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    key: values.key,
    category: values.category,
    description: values.description || "",
    value: "", // always start empty for security — user must re-enter
  });
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = values._isNew;
  const categoryOptions = Object.entries(CATEGORY_META).map(([id, m]) => ({ value: id, label: m.label }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isNew && !formData.value) {
        throw new Error("Value is required for new secrets");
      }
      await onSave(formData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateRandom = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const value = btoa(String.fromCharCode(...arr))
      .replace(/[+/=]/g, "")
      .slice(0, 40);
    setFormData((f) => ({ ...f, value }));
    setShowValue(true);
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
        <div>
          <Label htmlFor="key" className="text-xs font-semibold">
            Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id="key"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
            placeholder="SMTP_PASSWORD"
            required
            pattern="[A-Z][A-Z0-9_]*"
            className="mt-1.5 font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">UPPERCASE_WITH_UNDERSCORES only</p>
        </div>
        <div>
          <Label htmlFor="category" className="text-xs font-semibold">
            Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What is this secret used for?"
          maxLength={200}
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="value" className="text-xs font-semibold">
            Value {isNew ? <span className="text-red-500">*</span> : <span className="text-muted-foreground">(leave blank to keep current)</span>}
          </Label>
          <button
            type="button"
            onClick={generateRandom}
            className="text-xs text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold flex items-center gap-1"
          >
            <Wand2 className="h-3 w-3" />
            Generate random
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="value"
            type={showValue ? "text" : "password"}
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder={isNew ? "Enter the secret value" : "•••••••• (enter new value to change)"}
            className="pl-10 pr-10 font-mono"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-green-600" />
          Encrypted with AES-256-GCM before storage. Plaintext is never persisted.
        </p>
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
              Encrypting...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Save Secret
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
