"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  Bus,
  LogOut,
} from "lucide-react";
import { signOutUser, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/transport", label: "Transport", icon: Bus },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const adminName = getAdminName(user?.displayName, user?.email);
  const adminDetail = user?.displayName && user.email ? user.email : "Admin";
  const initials = getInitials(adminName);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOutUser();
      router.replace("/auth");
    } catch (error) {
      console.error("Failed to sign out", error);
      setSigningOut(false);
    }
  }

  return (
    <aside
      aria-label="Admin navigation"
      className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-outline-variant/30 bg-surface-container-low"
    >
      <div className="h-16 flex items-center px-6 border-b border-outline-variant/30">
        <Link
          href="/admin"
          className="text-xl font-headline font-extrabold tracking-tighter text-primary"
        >
          Uhambo
          <span className="text-on-surface-variant/60 font-medium ml-1.5 text-xs uppercase tracking-[0.2em]">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-outline-variant/30">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-sm"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">
              {adminName}
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              {adminDetail}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          <span>{signingOut ? "Signing out..." : "Log out"}</span>
        </button>
      </div>
    </aside>
  );
}

function getAdminName(displayName?: string | null, email?: string | null) {
  const name = displayName?.trim();
  if (name) return name;

  return email?.trim() || "Admin";
}

function getInitials(name: string) {
  const parts = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
