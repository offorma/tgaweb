"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Smartphone,
  ShieldCheck,
  Download,
  Copy,
  RefreshCw,
  X,
  Users,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HelpTip } from "@/components/admin/help-tip";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const SECTIONS = [
  { id: "general", label: "General", tip: "Basic school identity: name, tagline, motto, founding year, and crest image path.", fields: [
    { name: "schoolName", label: "School Name", type: "text", required: true, tip: "The full name shown in the navbar, footer, and browser title." },
    { name: "shortName", label: "Short Name", type: "text", required: true, tip: "Abbreviation used internally (e.g. TGA)." },
    { name: "tagline", label: "Tagline", type: "text", required: true, tip: "Your school's promise — shown on the hero section and footer. E.g. 'Excellence as You Glide Beyond Limits'." },
    { name: "motto", label: "Motto", type: "text", tip: "Shown in the scrolling marquee strip below the hero. E.g. 'Knowledge • Character • Service'." },
    { name: "founded", label: "Year Founded", type: "number", required: true, tip: "Used to calculate 'Years of Excellence' on the About section." },
    { name: "crestUrl", label: "Crest Image Path", type: "image", tip: "Path to your school crest. Default: /crest/school-crest.png. Also used as the favicon." },
  ]},
  { id: "hero", label: "Hero Section", tip: "The large banner at the top of the homepage with the headline, description, and Apply button.", fields: [
    { name: "heroBadge", label: "Top Badge Text", type: "text", required: true, tip: "The small orange pill at the top of the hero. E.g. 'Admissions Open for 2026/2027 Session'." },
    { name: "heroTitle1", label: "Headline (line 1)", type: "text", required: true, tip: "The first line of the big headline. Shown in white." },
    { name: "heroTitle2", label: "Headline (line 2 — gradient)", type: "text", required: true, tip: "The second line of the headline. Shown in orange/gold gradient." },
    { name: "heroDescription", label: "Description", type: "textarea", required: true, tip: "Paragraph text below the headline. Keep it 2-3 sentences." },
  ]},
  { id: "about", label: "About Section", tip: "The 'Who We Are' section with mission, vision, and core values.", fields: [
    { name: "aboutHeading", label: "Section Heading", type: "text", required: true, tip: "The large heading above the intro paragraph." },
    { name: "aboutParagraph", label: "Intro Paragraph", type: "textarea", required: true, tip: "The main paragraph describing your school's history and philosophy." },
    { name: "missionText", label: "Mission Statement", type: "textarea", required: true, tip: "What your school aims to do — shown in a white card." },
    { name: "visionText", label: "Vision Statement", type: "textarea", required: true, tip: "What your school aspires to become — shown in a navy card." },
  ]},
  { id: "admissions", label: "Admissions", tip: "The admissions timeline section with the 4-step process and deadline info.", fields: [
    { name: "admissionsHeading", label: "Section Heading", type: "text", required: true, tip: "The heading above the admissions timeline." },
    { name: "admissionsParagraph", label: "Intro Paragraph", type: "textarea", required: true, tip: "Short paragraph introducing your admissions process." },
    { name: "admissionsDeadline", label: "Deadline Text", type: "text", required: true, tip: "E.g. 'Applications close July 31, 2026'. Shown in the navy CTA card." },
    { name: "admissionsOpenDay", label: "Open Day Text", type: "text", required: true, tip: "E.g. 'Open Day: Saturday, 18 July 2026'. Shown in the navy CTA card." },
  ]},
  { id: "applyButton", label: "Apply Button", tip: "Configure the 'Apply Now' button that appears in the navbar, hero, admissions section, and footer. You can show/hide it, change the label, and choose what happens when clicked.", fields: [
    { name: "applyButtonEnabled", label: "Show Apply Button", type: "checkbox", tip: "Master switch. If off, ALL Apply buttons disappear from the site." },
    { name: "applyButtonLabel", label: "Button Text", type: "text", required: true, tip: "The text on the button. E.g. 'Apply Now', 'Start Application', 'Email Admissions'." },
    { name: "applyButtonType", label: "Button Action", type: "select", required: true, tip: "What happens when clicked: scroll to a section, open an external URL (e.g. Google Form), or open the email client.", options: [
      { value: "scroll", label: "Scroll to section on this page" },
      { value: "external", label: "Open external URL (e.g. Google Form)" },
      { value: "mailto", label: "Open email client (mailto:)" },
    ]},
    { name: "applyButtonUrl", label: "URL / Section anchor", type: "text", required: true, tip: "For 'scroll': use #admissions or #contact. For 'external': use https://... For 'mailto': use the email address." },
    { name: "applyButtonStyle", label: "Button Style", type: "select", required: true, tip: "Visual style: primary = orange gradient, outline = transparent/ghost.", options: [
      { value: "primary", label: "Primary (orange gradient)" },
      { value: "outline", label: "Outline (ghost)" },
    ]},
  ]},
  { id: "social", label: "Social Media", tip: "Links to your social media profiles. Leave blank to hide the icon — no dead links will show.", fields: [
    { name: "facebookUrl", label: "Facebook URL", type: "text", tip: "Full URL: https://facebook.com/yourpage. Leave blank to hide." },
    { name: "instagramUrl", label: "Instagram URL", type: "text", tip: "Full URL: https://instagram.com/yourhandle. Leave blank to hide." },
    { name: "youtubeUrl", label: "YouTube URL", type: "text", tip: "Full URL: https://youtube.com/@yourchannel. Leave blank to hide." },
    { name: "twitterUrl", label: "Twitter / X URL", type: "text", tip: "Full URL: https://x.com/yourhandle. Leave blank to hide." },
  ]},
  { id: "resources", label: "Footer Links", tip: "Links in the footer 'Resources' column (Admissions Portal, Fee Structure, etc.). Leave blank to hide. Use #admissions or #contact for in-page anchors.", fields: [
    { name: "resourceAdmissionsPortal", label: "Admissions Portal URL", type: "text", tip: "Link to your online admissions portal. Leave blank to hide." },
    { name: "resourceFeeStructure", label: "Fee Structure URL", type: "text", tip: "Link to a fee schedule page or PDF. Leave blank to hide." },
    { name: "resourceSchoolCalendar", label: "School Calendar URL", type: "text", tip: "Link to the academic calendar. Leave blank to hide." },
    { name: "resourceParentPortal", label: "Parent Portal URL", type: "text", tip: "Link to the parent login portal. Leave blank to hide." },
    { name: "resourceAlumniNetwork", label: "Alumni Network URL", type: "text", tip: "Link to alumni page or group. Leave blank to hide." },
    { name: "resourceCareers", label: "Careers URL", type: "text", tip: "Link to job openings page. Leave blank to hide." },
  ]},
  { id: "contact", label: "Contact Info", tip: "Your school's address, phone numbers, email addresses, and office hours. Shown in the Contact section and footer.", fields: [
    { name: "address", label: "Address", type: "text", required: true, tip: "Full postal address. Shown in Contact section + footer." },
    { name: "location", label: "Location", type: "text", required: true, tip: "Short location (city, state, country). Shown in the marquee strip." },
    { name: "phone", label: "Primary Phone", type: "text", required: true, tip: "Main phone number. Shown in navbar, Contact section, + footer." },
    { name: "phoneAlt", label: "Alternate Phone", type: "text", tip: "Secondary phone number (optional)." },
    { name: "email", label: "General Email", type: "text", required: true, tip: "General enquiries email. Shown in Contact section + footer." },
    { name: "admissionsEmail", label: "Admissions Email", type: "text", required: true, tip: "Email shown in the Admissions section. Also receives contact form submissions." },
    { name: "hours", label: "Office Hours", type: "text", required: true, tip: "E.g. 'Monday – Friday: 7:30 AM – 3:30 PM'. Shown in navbar + Contact section." },
  ]},
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("general");
  const [forcePwChange, setForcePwChange] = useState(false);

  // Honour ?tab= / ?force= from the URL (e.g. the forced-password-change redirect).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab")) setTab(q.get("tab")!);
    if (q.get("force") === "1") {
      setTab("security");
      setForcePwChange(true);
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json();
      setData(json.settings || {});
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSection = async (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    setSavingSection(sectionId);
    try {
      // Build payload with ALL current data (API expects the full object)
      const payload = { ...data };
      if (payload.founded) payload.founded = Number(payload.founded);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      const json = await res.json();
      setData(json.settings || payload);
      toast({
        title: `${section.label} saved`,
        description: "Changes are now live on the website.",
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Site Settings"
        description="Edit global content for the homepage, contact details, and branding. Each section has its own save button."
      />

      {/* Search bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings... (e.g. 'phone', 'hero', 'facebook', 'password')"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10 h-11 bg-white border-black/10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results (shown when search is active) */}
      {search.trim() && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 mb-6">
          <SearchResults
            search={search.trim().toLowerCase()}
            data={data}
            update={update}
          />
        </div>
      )}

      {forcePwChange && (
        <div className="mb-6 flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Change your password to continue.</strong> For security, you must
            set your own password before you can access the rest of the admin area.
          </span>
        </div>
      )}

      {/* Normal tabbed view (hidden when searching) */}
      {!search.trim() && (
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-white border border-black/5">
          {SECTIONS.map((s) => (
            <TabsTrigger
              key={s.id}
              value={s.id}
              className="data-[state=active]:bg-[var(--navy)] data-[state=active]:text-white"
            >
              {s.label}
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-[var(--navy)] data-[state=active]:text-white"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="policy"
            className="data-[state=active]:bg-[var(--navy)] data-[state=active]:text-white"
          >
            Security Policy
          </TabsTrigger>
        </TabsList>

        {SECTIONS.map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[var(--navy)] mb-1 flex items-center gap-1.5">
                    {section.label}
                    <HelpTip content={section.tip} />
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Edit the fields below and click save when done.
                  </p>
                </div>
                <Button
                  onClick={() => handleSaveSection(section.id)}
                  disabled={savingSection === section.id}
                  className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white flex-shrink-0"
                >
                  {savingSection === section.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1.5" />
                      Save {section.label}
                    </>
                  )}
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {section.fields.map((f) => (
                  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={f.name} className="text-xs font-semibold flex items-center gap-1">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      {f.tip && <HelpTip content={f.tip} />}
                    </Label>
                    {f.type === "text" && (
                      <Input
                        id={f.name}
                        value={data[f.name] ?? ""}
                        onChange={(e) => update(f.name, e.target.value)}
                        className="mt-1.5"
                      />
                    )}
                    {f.type === "number" && (
                      <Input
                        id={f.name}
                        type="number"
                        value={data[f.name] ?? 0}
                        onChange={(e) => update(f.name, Number(e.target.value))}
                        className="mt-1.5"
                      />
                    )}
                    {f.type === "textarea" && (
                      <Textarea
                        id={f.name}
                        value={data[f.name] ?? ""}
                        onChange={(e) => update(f.name, e.target.value)}
                        rows={4}
                        className="mt-1.5 resize-y"
                      />
                    )}
                    {f.type === "image" && (
                      <div className="mt-1.5">
                        <ImageUploadField
                          id={f.name}
                          value={data[f.name] ?? ""}
                          onChange={(url) => update(f.name, url)}
                          previewStyle="portrait"
                        />
                      </div>
                    )}
                    {f.type === "select" && f.options && (
                      <select
                        id={f.name}
                        value={data[f.name] ?? ""}
                        onChange={(e) => update(f.name, e.target.value)}
                        className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      >
                        {f.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {f.type === "checkbox" && (
                      <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                        <input
                          id={f.name}
                          type="checkbox"
                          checked={!!data[f.name]}
                          onChange={(e) => update(f.name, e.target.checked)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm text-muted-foreground">
                          {data[f.name] ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="security">
          <div className="space-y-6">
            <TwoFactorCard />
            <ChangePasswordCard />
          </div>
        </TabsContent>

        <TabsContent value="policy">
          <SecurityPolicyCard />
        </TabsContent>
      </Tabs>
      )}
    </>
  );
}

// ============ Search Results ============

function SearchResults({
  search,
  data,
  update,
}: {
  search: string;
  data: Record<string, any>;
  update: (name: string, value: any) => void;
}) {
  // Build a flat list of all fields with their section info
  const allFields = SECTIONS.flatMap((section) =>
    section.fields.map((f) => ({ ...f, sectionLabel: section.label, sectionId: section.id }))
  );

  // Filter by search query — match against section label, field label, tip, and current value
  const matches = allFields.filter((f) => {
    const haystack = [
      f.sectionLabel,
      f.label,
      f.tip || "",
      String(data[f.name] ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">
          No settings found for <strong>"{search}"</strong>. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-bold text-[var(--navy)]">
          {matches.length} {matches.length === 1 ? "result" : "results"} for "{search}"
        </h3>
        <span className="text-xs text-muted-foreground">
          Edit fields below — then go to the relevant tab to save.
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        {matches.map((f) => (
          <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <Label htmlFor={f.name} className="text-xs font-semibold flex items-center gap-1">
              {f.label}
              {f.required && <span className="text-red-500 ml-0.5">*</span>}
              {f.tip && <HelpTip content={f.tip} />}
              <Badge className="ml-1 bg-[var(--navy)]/10 text-[var(--navy)] hover:bg-[var(--navy)]/15 text-[10px]">
                {f.sectionLabel}
              </Badge>
            </Label>
            {f.type === "text" && (
              <Input
                id={f.name}
                value={data[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                className="mt-1.5"
              />
            )}
            {f.type === "number" && (
              <Input
                id={f.name}
                type="number"
                value={data[f.name] ?? 0}
                onChange={(e) => update(f.name, Number(e.target.value))}
                className="mt-1.5"
              />
            )}
            {f.type === "textarea" && (
              <Textarea
                id={f.name}
                value={data[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                rows={4}
                className="mt-1.5 resize-y"
              />
            )}
            {f.type === "image" && (
              <div className="mt-1.5 space-y-2">
                <Input
                  id={f.name}
                  value={data[f.name] ?? ""}
                  onChange={(e) => update(f.name, e.target.value)}
                />
                {data[f.name] && (
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--orange)]/30">
                    <img
                      src={data[f.name]}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
            {f.type === "select" && f.options && (
              <select
                id={f.name}
                value={data[f.name] ?? ""}
                onChange={(e) => update(f.name, e.target.value)}
                className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {f.type === "checkbox" && (
              <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                <input
                  id={f.name}
                  type="checkbox"
                  checked={!!data[f.name]}
                  onChange={(e) => update(f.name, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-muted-foreground">
                  {data[f.name] ? "Enabled" : "Disabled"}
                </span>
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Strength checks
  const checks = [
    { label: "At least 12 characters", ok: next.length >= 12 },
    { label: "Has uppercase letter", ok: /[A-Z]/.test(next) },
    { label: "Has lowercase letter", ok: /[a-z]/.test(next) },
    { label: "Has digit", ok: /[0-9]/.test(next) },
    { label: "Has symbol", ok: /[^A-Za-z0-9]/.test(next) },
    { label: "Passwords match", ok: !!next && next === confirm },
  ];
  const allOk = checks.every((c) => c.ok);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allOk) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to change password");
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({
        title: "Password changed",
        description: "Please sign in again with your new password.",
      });
      // Sign out so the session token refreshes (clears mustChangePassword and
      // the forced-change redirect). Brief delay lets the toast show.
      setTimeout(() => {
        signOut({ callbackUrl: "/admin/login" });
      }, 1200);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <Lock className="h-5 w-5 text-red-700" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[var(--navy)]">Change Password</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Use a strong, unique password. After 5 failed login attempts, your account will be locked for 15 minutes.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 max-w-md">
        <div>
          <Label htmlFor="current" className="text-xs font-semibold">Current Password</Label>
          <div className="relative mt-1.5">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="current"
              type={showPwd ? "text" : "password"}
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="next" className="text-xs font-semibold">New Password</Label>
          <Input
            id="next"
            type={showPwd ? "text" : "password"}
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="confirm" className="text-xs font-semibold">Confirm New Password</Label>
          <Input
            id="confirm"
            type={showPwd ? "text" : "password"}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={c.ok ? "text-green-700" : "text-muted-foreground"}>
                {c.label}
              </span>
            </div>
          ))}
        </div>

        <Button
          type="submit"
          disabled={!allOk || saving || !current}
          className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-1.5" />
              Update Password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// ============ Two-Factor Authentication Card ============

function TwoFactorCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup dialog state
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    otpauth: string;
  } | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Disable dialog state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableTotp, setDisableTotp] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  // Regenerate backup codes dialog
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenTotp, setRegenTotp] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

  // Load current 2FA status
  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/me");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEnabled(!!data.user?.twoFactorEnabled);
    } catch (e: any) {
      toast({
        title: "Failed to load 2FA status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Start the setup flow: fetch a new secret + QR code
  const startSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Setup failed");
      }
      const data = await res.json();
      setSetupData(data);
      setSetupOpen(true);
    } catch (e: any) {
      toast({ title: "Setup failed", description: e.message, variant: "destructive" });
    } finally {
      setSetupLoading(false);
    }
  };

  // Verify the TOTP code from the user's authenticator app and enable 2FA
  const verifyAndEnable = async () => {
    if (!setupData || !/^\d{6}$/.test(setupToken)) {
      toast({ title: "Enter a 6-digit code", variant: "destructive" });
      return;
    }
    setSetupLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setupData.secret, token: setupToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setSetupToken("");
      toast({
        title: "2FA enabled!",
        description: "Save your backup codes now.",
      });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setSetupLoading(false);
    }
  };

  const closeSetup = () => {
    setSetupOpen(false);
    setSetupData(null);
    setSetupToken("");
  };

  const closeBackupCodes = () => {
    setBackupCodes(null);
    setSetupOpen(false);
    setSetupData(null);
  };

  // Disable 2FA flow
  const confirmDisable = async () => {
    setDisableLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, totp: disableTotp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Disable failed");
      }
      setEnabled(false);
      setDisableOpen(false);
      setDisablePassword("");
      setDisableTotp("");
      toast({ title: "2FA disabled" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setDisableLoading(false);
    }
  };

  // Regenerate backup codes flow
  const confirmRegen = async () => {
    setRegenLoading(true);
    try {
      const res = await fetch("/api/admin/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regenPassword, totp: regenTotp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Regeneration failed");
      }
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setRegenOpen(false);
      setRegenPassword("");
      setRegenTotp("");
      toast({ title: "New backup codes generated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setRegenLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!backupCodes) return;
    const text = `Trail Gliders Academy — Admin 2FA Backup Codes
Generated: ${new Date().toLocaleString()}

Each code can be used ONCE to sign in if you lose your authenticator device.
Store this list in a secure, offline location.

${backupCodes.map((c, i) => `${(i + 1).toString().padStart(2, "0")}. ${c}`).join("\n")}

⚠️  Treat these codes like passwords. Anyone with access to them can access your admin account.
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trail-gliders-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllCodes = async () => {
    if (!backupCodes) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast({ title: "All codes copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? "bg-green-100" : "bg-amber-100"}`}>
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-700" />
          ) : (
            <Smartphone className="h-5 w-5 text-amber-700" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl font-bold text-[var(--navy)]">
            Two-Factor Authentication (2FA)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enabled
              ? "Enabled — your account requires a 6-digit code from your authenticator app at every sign-in."
              : "Add an extra layer of security. After enabling, sign-in will require both your password AND a code from your authenticator app (Google Authenticator, Authy, 1Password, etc.)."}
          </p>
        </div>
        {enabled && (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
            Active
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {!enabled ? (
          <Button
            onClick={startSetup}
            disabled={setupLoading}
            className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
          >
            {setupLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4 mr-1.5" />
            )}
            Enable 2FA
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setRegenOpen(true)}
              variant="outline"
              className="border-[var(--navy)]/20"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Regenerate Backup Codes
            </Button>
            <Button
              onClick={() => setDisableOpen(true)}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1.5" />
              Disable 2FA
            </Button>
          </>
        )}
      </div>

      {/* Setup dialog */}
      <Dialog open={setupOpen && !backupCodes} onOpenChange={(o) => { if (!o) closeSetup(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl border-2 border-[var(--navy)]/10">
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    className="h-48 w-48"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Or enter this code manually:</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-xs break-all">
                  {setupData.secret}
                </div>
              </div>

              <div>
                <Label htmlFor="setup-token" className="text-xs font-semibold">
                  Enter the 6-digit code from your app *
                </Label>
                <Input
                  id="setup-token"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 text-center font-mono text-lg tracking-[0.4em]"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeSetup} disabled={setupLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={verifyAndEnable}
                  disabled={setupLoading || setupToken.length !== 6}
                  className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
                >
                  {setupLoading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                  )}
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup codes display dialog */}
      <Dialog open={!!backupCodes} onOpenChange={(o) => { if (!o) closeBackupCodes(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription>
              These 10 codes can each be used ONCE to sign in if you lose your authenticator device.
              Save them in a secure, offline location — they will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {backupCodes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="text-center font-semibold text-[var(--navy)]">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-1.5" />
                  Download .txt
                </Button>
                <Button onClick={copyAllCodes} variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy all
                </Button>
              </div>
              <Button onClick={closeBackupCodes} className="w-full bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                I've saved my codes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              For your security, please confirm your password and a current 2FA code to disable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Current Password</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">2FA Code (or backup code)</Label>
              <Input
                value={disableTotp}
                onChange={(e) => setDisableTotp(e.target.value)}
                className="mt-1 font-mono text-center tracking-wider"
                placeholder="000000 or XXXX-XXXX"
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDisableOpen(false)} disabled={disableLoading}>
                Cancel
              </Button>
              <Button
                onClick={confirmDisable}
                disabled={disableLoading || !disablePassword || !disableTotp}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {disableLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1.5" />
                )}
                Disable 2FA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate backup codes dialog */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              This will invalidate your existing backup codes and generate new ones.
              Confirm with your password and current 2FA code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Current Password</Label>
              <Input
                type="password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Current 2FA Code</Label>
              <Input
                value={regenTotp}
                onChange={(e) => setRegenTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 font-mono text-center tracking-[0.4em]"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRegenOpen(false)} disabled={regenLoading}>
                Cancel
              </Button>
              <Button
                onClick={confirmRegen}
                disabled={regenLoading || !regenPassword || regenTotp.length !== 6}
                className="bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
              >
                {regenLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Security Policy Card ============

function SecurityPolicyCard() {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/security-policy");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setPolicy(data.policy);
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const update = (key: string, value: any) => {
    setPolicy((p: any) => ({ ...p, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/security-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enforceTwoFactorForAdmins: policy.enforceTwoFactorForAdmins,
          enforceTwoFactorForEditors: policy.enforceTwoFactorForEditors,
          minPasswordLength: Number(policy.minPasswordLength),
          sessionTimeoutHours: Number(policy.sessionTimeoutHours),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      toast({
        title: "Security policy updated",
        description: policy.enforceTwoFactorForAdmins
          ? "All admin users without 2FA will be required to set it up on next login."
          : "2FA enforcement disabled for admins.",
      });
      const data = await res.json();
      setPolicy(data.policy);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!policy) {
    return <div className="text-center py-8 text-muted-foreground">Failed to load policy.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--navy)]/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-[var(--navy)]" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--navy)]">Global Security Policy</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              These rules apply to all admin and editor accounts. Changes take effect immediately
              for new logins.
            </p>
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="ml-auto bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-1.5" />Save Policy</>
            )}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-start gap-3 p-4 bg-[var(--cream)] rounded-lg cursor-pointer hover:bg-[var(--cream)]/70 transition-colors">
            <input
              type="checkbox"
              checked={policy.enforceTwoFactorForAdmins}
              onChange={(e) => update("enforceTwoFactorForAdmins", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--navy)]" />
                <span className="font-semibold text-[var(--navy)] flex items-center gap-1">
                  Require 2FA for all ADMIN accounts
                  <HelpTip content="When enabled, any admin without 2FA will be flagged on their next login and shown a banner until they enable it. Strongly recommended." />
                </span>
                {policy.enforceTwoFactorForAdmins && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Enforced</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, any admin without 2FA will be flagged <code>mustEnable2FA</code> on their next
                login and shown a prominent banner until they enable it. <strong>Recommended.</strong>
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-[var(--cream)] rounded-lg cursor-pointer hover:bg-[var(--cream)]/70 transition-colors">
            <input
              type="checkbox"
              checked={policy.enforceTwoFactorForEditors}
              onChange={(e) => update("enforceTwoFactorForEditors", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--orange)]" />
                <span className="font-semibold text-[var(--navy)] flex items-center gap-1">
                  Require 2FA for all EDITOR accounts
                  <HelpTip content="Extends 2FA requirement to content editors. Recommended if editors can publish sensitive content or upload files." />
                </span>
                {policy.enforceTwoFactorForEditors && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Enforced</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Extends 2FA requirement to content editors. Recommended if editors can publish
                sensitive content or upload files.
              </p>
            </div>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--cream)] rounded-lg">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Minimum Password Length
                <HelpTip content="Applied to new accounts and password changes. Default: 12 characters. Higher is more secure." />
              </Label>
              <Input
                type="number"
                min={8}
                max={128}
                value={policy.minPasswordLength}
                onChange={(e) => update("minPasswordLength", e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to new accounts and password changes. Default: 12.
              </p>
            </div>
            <div className="p-4 bg-[var(--cream)] rounded-lg">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Session Timeout (hours)
                <HelpTip content="How long a login session stays valid before the admin must sign in again. Default: 8 hours." />
              </Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={policy.sessionTimeoutHours}
                onChange={(e) => update("sessionTimeoutHours", e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How long a login session stays valid. Default: 8 hours.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Important:</strong> When you enable 2FA enforcement, all users in that role
            without 2FA will be flagged on their next login. They will see a prominent banner in
            the admin panel directing them to enable 2FA. Existing sessions are not interrupted,
            but new logins will be subject to the policy.
          </div>
        </div>
      </div>
    </div>
  );
}
