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
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
  mustEnable2FA: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; email: string } | null;
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/me"),
      ]);
      if (!usersRes.ok) throw new Error("Failed to load users");
      const data = await usersRes.json();
      setUsers(data.users || []);
      const me = await meRes.json();
      setCurrentUserId(me.user?.id || "");
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const text = `${u.name} ${u.email} ${u.role}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <>
      <AdminPageHeader
        title="User Management"
        description="Create and manage admin & editor accounts. New admins are required to enable 2FA on first login."
        action={
          <Button
            onClick={() => setCreating(true)}
            className="bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Invite User
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-black/10">
          <div className="text-muted-foreground">No users found.</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--cream)] border-b border-black/5">
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    <span className="flex items-center gap-1">Role <HelpTip content="ADMIN = full access (secrets, users, settings, content). EDITOR = content only (programs, news, etc.)." /></span>
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    <span className="flex items-center gap-1">2FA <HelpTip content="Two-Factor Authentication status. 'Enabled' = active. 'Required' = user must set it up on next login. 'Disabled' = not enforced." /></span>
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">
                    <span className="flex items-center gap-1">Status <HelpTip content="Active = can sign in. Disabled = account suspended, cannot sign in." /></span>
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">Last Login</th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--cream)]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-white ${
                            u.role === "ADMIN" ? "bg-[var(--navy)]" : "bg-[var(--orange)]"
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--navy)] flex items-center gap-1.5">
                              {u.name}
                              {isSelf && <span className="text-[10px] text-muted-foreground font-normal">(you)</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          u.role === "ADMIN"
                            ? "bg-[var(--navy)]/10 text-[var(--navy)] hover:bg-[var(--navy)]/15"
                            : "bg-[var(--orange)]/10 text-[var(--orange-dark)] hover:bg-[var(--orange)]/15"
                        }>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.twoFactorEnabled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Enabled
                          </span>
                        ) : u.mustEnable2FA ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700">
                            <X className="h-3.5 w-3.5" />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => { setEditing(u); setCreating(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(u)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own account" : "Delete user"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Invite New User"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the user's profile, role, or reset their password."
                : "Create a new admin or editor account. The user will be required to enable 2FA and change their temporary password on first login."}
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <EditUserForm
              key={editing.id}
              user={editing}
              isSelf={editing.id === currentUserId}
              onSave={async (data) => {
                const res = await fetch(`/api/admin/users/${editing.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || "Save failed");
                }
                toast({ title: "User updated" });
                setEditing(null);
                setCreating(false);
                await load();
              }}
              onCancel={() => { setEditing(null); setCreating(false); }}
            />
          ) : (
            <CreateUserForm
              onSave={async (data) => {
                const res = await fetch("/api/admin/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || "Create failed");
                }
                toast({
                  title: "User created",
                  description: "Share the temporary password with the new user securely (in person or via separate channel).",
                });
                setCreating(false);
                await load();
              }}
              onCancel={() => setCreating(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}).
              Their audit logs will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  toast({ title: "Delete failed", description: err.error, variant: "destructive" });
                  return;
                }
                toast({ title: "User deleted" });
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

// ============ Create User Form ============

function CreateUserForm({
  onSave,
  onCancel,
}: {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = [
    { label: "At least 12 characters", ok: password.length >= 12 },
    { label: "Has uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Has lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Has digit", ok: /[0-9]/.test(password) },
    { label: "Has symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordOk = checks.every((c) => c.ok);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    let pwd = "";
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 20; i++) pwd += chars[arr[i] % chars.length];
    setPassword(pwd);
    setShowPwd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name, email, role, password,
        requireTwoFactor: role === "ADMIN" ? true : requireTwoFactor,
        requirePasswordChange,
      });
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
        <div>
          <Label htmlFor="name" className="text-xs font-semibold">Full Name *</Label>
          <div className="relative mt-1.5">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="pl-10" placeholder="Ngozi Ugwu" />
          </div>
        </div>
        <div>
          <Label htmlFor="email" className="text-xs font-semibold">Email *</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} className="pl-10" placeholder="ngozi@trailgliders.edu.ng" />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="role" className="text-xs font-semibold flex items-center gap-1">
          Role *
          <HelpTip content="ADMIN = full access including secrets, user management, and settings. EDITOR = can only manage site content (programs, news, faculty, etc.)." />
        </Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="EDITOR">EDITOR — can manage site content (programs, news, etc.)</option>
          <option value="ADMIN">ADMIN — full access: secrets, users, settings, content</option>
        </select>
        {role === "ADMIN" && (
          <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admins are <strong>required</strong> to enable 2FA on first login.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="password" className="text-xs font-semibold">Temporary Password *</Label>
          <button type="button" onClick={generatePassword} className="text-xs text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold">
            Generate strong password
          </button>
        </div>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10 pr-10 font-mono"
            placeholder="••••••••••••"
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.ok ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
              <span className={c.ok ? "text-green-700" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-3 bg-[var(--cream)] rounded-lg">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={role === "ADMIN" ? true : requireTwoFactor}
            onChange={(e) => setRequireTwoFactor(e.target.checked)}
            disabled={role === "ADMIN"}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <div>
            <div className="text-sm font-semibold">Require 2FA on first login {role === "ADMIN" && "(required for admins)"}</div>
            <div className="text-xs text-muted-foreground">User cannot navigate the admin panel until 2FA is enabled.</div>
          </div>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={requirePasswordChange}
            onChange={(e) => setRequirePasswordChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <div>
            <div className="text-sm font-semibold">Require password change on first login</div>
            <div className="text-xs text-muted-foreground">User must set their own password before using the admin panel.</div>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button
          type="submit"
          disabled={saving || !name || !email || !passwordOk}
          className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating...</>
          ) : (
            <><UserPlus className="h-4 w-4 mr-1.5" />Create User</>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============ Edit User Form ============

function EditUserForm({
  user,
  isSelf,
  onSave,
  onCancel,
}: {
  user: User;
  isSelf: boolean;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [mustEnable2FA, setMustEnable2FA] = useState(user.mustEnable2FA);
  const [mustChangePassword, setMustChangePassword] = useState(user.mustChangePassword);
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data: any = { name, role, isActive, mustEnable2FA, mustChangePassword };
      if (newPassword) data.newPassword = newPassword;
      await onSave(data);
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
        <div>
          <Label className="text-xs font-semibold">Email (read-only)</Label>
          <Input value={user.email} disabled className="mt-1.5 bg-muted" />
        </div>
        <div>
          <Label htmlFor="edit-name" className="text-xs font-semibold">Full Name *</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label htmlFor="edit-role" className="text-xs font-semibold">Role</Label>
        <select
          id="edit-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isSelf}
          className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          <option value="EDITOR">EDITOR — content management only</option>
          <option value="ADMIN">ADMIN — full access</option>
        </select>
        {isSelf && (
          <p className="mt-1 text-xs text-muted-foreground">You cannot change your own role. Ask another admin.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-[var(--cream)] rounded-lg">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isSelf} className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold flex items-center gap-1">
              Account active
              <HelpTip content="If unchecked, the user cannot sign in. Use this to temporarily suspend an account without deleting it." />
            </div>
            <div className="text-xs text-muted-foreground">Inactive users cannot sign in.</div>
          </div>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-[var(--cream)] rounded-lg">
          <input type="checkbox" checked={mustEnable2FA} onChange={(e) => setMustEnable2FA(e.target.checked)} className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold flex items-center gap-1">
              Force 2FA setup
              <HelpTip content="If checked, the user will see a prominent banner on their next login directing them to enable 2FA in Settings → Security." />
            </div>
            <div className="text-xs text-muted-foreground">Show a banner until they enable it.</div>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1">
          Reset Password (optional)
          <HelpTip content="Set a new temporary password for this user. They will be forced to change it on their next login. Leave blank to keep the current password." />
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPwd ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-10 pr-10 font-mono"
            placeholder="•••••••• (leave blank to keep current)"
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {newPassword && (
          <p className="text-xs text-amber-700">The user will be forced to change this password on next login.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white">
          {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-1.5" />Save Changes</>}
        </Button>
      </div>
    </form>
  );
}
