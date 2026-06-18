"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Settings,
  GraduationCap,
  Users,
  Star,
  Newspaper,
  BarChart3,
  HelpCircle,
  ListChecks,
  Image as ImageIcon,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  KeyRound,
  UserCog,
  GalleryVerticalEnd,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, tip: "Overview of your site — quick actions, content counts, and recent activity logs." },
  { href: "/admin/settings", label: "Site Settings", icon: Settings, tip: "Edit school name, contact info, hero text, mission/vision, admissions info, social media links, and the Apply button." },
  { href: "/admin/slides", label: "Hero Slides", icon: GalleryVerticalEnd, tip: "Manage the background slideshow on the homepage hero. Add images, titles, subtitles, and CTAs for each slide." },
  { href: "/admin/programs", label: "Programs", icon: GraduationCap, tip: "Manage the 3 academic programs shown on the homepage (Nursery, Lower Primary, Upper Primary)." },
  { href: "/admin/faculty", label: "Faculty", icon: Users, tip: "Add, edit, or remove teacher profiles shown in the 'Meet Our Educators' section." },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star, tip: "Manage parent quotes shown in the rotating carousel on the homepage." },
  { href: "/admin/news", label: "News & Events", icon: Newspaper, tip: "Post news items and upcoming events. Unpublished items are hidden from the public site." },
  { href: "/admin/stats", label: "Statistics", icon: BarChart3, tip: "Edit the big numbers shown in the 'By the Numbers' section (years, pupils, educators, placement rate)." },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, tip: "Manage the frequently asked questions shown in the accordion section." },
  { href: "/admin/admissions", label: "Admissions", icon: ListChecks, tip: "Edit the 4-step application process timeline shown on the homepage." },
  { href: "/admin/campus", label: "Campus Life", icon: ImageIcon, tip: "Manage the photo grid showing sports, arts, STEM, library, and other campus activities." },
  { href: "/admin/secrets", label: "Secrets Vault", icon: KeyRound, tip: "Encrypted storage for SMTP passwords, payment gateway keys, and other sensitive credentials. Master key lives in your cPanel environment." },
  { href: "/admin/users", label: "User Management", icon: UserCog, tip: "Create and manage admin & editor accounts. New admins are required to enable 2FA on first login." },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[var(--cream)] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-[var(--navy)] text-white flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent
          pathname={pathname}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-72 bg-[var(--navy)] text-white z-50 lg:hidden flex flex-col"
            >
              <SidebarContent
                pathname={pathname}
                onSignOut={handleSignOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-black/5 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-[var(--navy)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full overflow-hidden ring-1 ring-[var(--orange)]/40">
              <img
                src="/crest/school-crest.png"
                alt="Crest"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-serif font-bold text-[var(--navy)] text-sm">
              TGA Admin
            </span>
          </Link>
          <div className="w-9" />
        </header>

        <main className="p-4 lg:p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onSignOut,
  onClose,
}: {
  pathname: string;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-[var(--orange)]/40 flex-shrink-0">
            <img
              src="/crest/school-crest.png"
              alt="Trail Gliders Academy Crest"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="font-serif font-bold text-sm leading-tight">Trail Gliders</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--orange-light)] font-bold">
              Admin Portal
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="ml-auto lg:hidden text-white/70" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? "bg-white/10 text-white shadow-inner"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      active ? "text-[var(--orange-light)]" : "text-white/50 group-hover:text-white"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                  {active && (
                    <ChevronRight className="h-4 w-4 ml-auto text-[var(--orange-light)]" />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] bg-[var(--navy-dark)] text-white border border-white/10 shadow-xl">
                {item.tip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-white/50" />
              <span className="font-medium">View Website</span>
            </a>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] bg-[var(--navy-dark)] text-white border border-white/10">
            Opens the public website in a new tab so you can see your changes live.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sign Out</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] bg-[var(--navy-dark)] text-white border border-white/10">
            Ends your admin session. You'll need to sign in again (with 2FA if enabled).
          </TooltipContent>
        </Tooltip>
        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-[10px] text-white/40">
          <ShieldCheck className="h-3 w-3" />
          <span>Secured • All actions logged</span>
        </div>
      </div>
    </>
  );
}

// Page-level helpers

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[var(--navy)]">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-black/5 shadow-sm ${className || ""}`}
    >
      {children}
    </div>
  );
}
