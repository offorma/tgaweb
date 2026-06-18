import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminPageHeader, AdminCard } from "@/components/admin/shell";
import { QuickActionLink, StatCardLink } from "@/components/admin/dashboard-links";
import { db } from "@/lib/db";
import {
  GraduationCap,
  Users,
  Star,
  Newspaper,
  Settings,
  HelpCircle,
  ListChecks,
  Image as ImageIcon,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const QUICK_LINKS = [
  { href: "/admin/settings", label: "Edit Hero & Settings", icon: Settings, color: "from-[var(--navy)] to-[var(--navy-light)]", tip: "Change the school name, tagline, hero text, contact info, social links, and the Apply button." },
  { href: "/admin/programs", label: "Manage Programs", icon: GraduationCap, color: "from-[var(--orange)] to-[var(--orange-dark)]", tip: "Add, edit, or remove academic programs (Nursery, Lower Primary, Upper Primary)." },
  { href: "/admin/faculty", label: "Manage Faculty", icon: Users, color: "from-[var(--gold)] to-amber-600", tip: "Add or edit teacher profiles with photos, bios, and quotes." },
  { href: "/admin/news", label: "Post News", icon: Newspaper, color: "from-purple-600 to-purple-700", tip: "Publish news items and event announcements. Toggle 'published' to show/hide." },
  { href: "/admin/testimonials", label: "Add Testimonial", icon: Star, color: "from-pink-500 to-rose-600", tip: "Add parent quotes to the rotating carousel on the homepage." },
  { href: "/admin/faqs", label: "Edit FAQs", icon: HelpCircle, color: "from-teal-500 to-cyan-600", tip: "Add or edit frequently asked questions shown in the accordion section." },
];

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  // Counts
  const [
    programsCount,
    facultyCount,
    testimonialsCount,
    newsCount,
    faqsCount,
    statsCount,
    admissionsCount,
    campusCount,
    recentLogs,
  ] = await Promise.all([
    db.program.count(),
    db.faculty.count(),
    db.testimonial.count(),
    db.newsItem.count(),
    db.faq.count(),
    db.stat.count(),
    db.admissionStep.count(),
    db.campusItem.count(),
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  const counts = [
    { label: "Programs", value: programsCount, icon: GraduationCap, href: "/admin/programs", tip: "Number of academic programs. Click to manage them." },
    { label: "Faculty Members", value: facultyCount, icon: Users, href: "/admin/faculty", tip: "Number of teacher profiles. Click to add or edit." },
    { label: "Testimonials", value: testimonialsCount, icon: Star, href: "/admin/testimonials", tip: "Number of parent quotes in the carousel. Click to manage." },
    { label: "News Items", value: newsCount, icon: Newspaper, href: "/admin/news", tip: "Total news & event items (published and drafts). Click to manage." },
    { label: "FAQs", value: faqsCount, icon: HelpCircle, href: "/admin/faqs", tip: "Number of frequently asked questions. Click to edit." },
    { label: "Statistics", value: statsCount, icon: BarChart3, href: "/admin/stats", tip: "Number of stat cards shown in 'By the Numbers'. Click to edit." },
    { label: "Admission Steps", value: admissionsCount, icon: ListChecks, href: "/admin/admissions", tip: "Number of steps in the admissions timeline. Click to edit." },
    { label: "Campus Items", value: campusCount, icon: ImageIcon, href: "/admin/campus", tip: "Number of campus life photos. Click to manage." },
  ];

  return (
    <>
      <AdminPageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] || "Admin"}`}
        description="Manage all the content on your school website from this dashboard."
      />

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <QuickActionLink
                key={link.href}
                href={link.href}
                label={link.label}
                color={link.color}
                tip={link.tip}
                icon={<Icon className="h-5 w-5 text-white" />}
              />
            );
          })}
        </div>
      </section>

      {/* Stats grid */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Content Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {counts.map((c) => {
            const Icon = c.icon;
            return (
              <StatCardLink
                key={c.label}
                href={c.href}
                value={c.value}
                label={c.label}
                tip={c.tip}
                icon={<Icon className="h-5 w-5 text-[var(--orange)]" />}
              />
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Recent Activity
        </h2>
        <AdminCard className="overflow-hidden">
          <div className="divide-y divide-black/5">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            ) : (
              recentLogs.map((log) => {
                const isLogin = log.action.startsWith("login.");
                return (
                  <div key={log.id} className="p-4 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isLogin
                        ? "bg-green-100 text-green-700"
                        : log.action.includes("fail") || log.action.includes("delete")
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {isLogin ? <ShieldCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {log.action.replace(/\./g, " ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.user?.email || "Anonymous"} • {log.ip || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AdminCard>
      </section>
    </>
  );
}
