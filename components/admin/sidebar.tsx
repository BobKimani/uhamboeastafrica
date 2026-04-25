"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  Bus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/hotels", label: "Hotels", icon: Building2 },
  { href: "/admin/transport", label: "Transport", icon: Bus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

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
            BK
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">
              Bob Kimani
            </p>
            <p className="text-xs text-on-surface-variant truncate">Operator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
