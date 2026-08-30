"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  Bus,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/hotels", label: "Hotels", icon: Building2 },
  { href: "/admin/transport", label: "Vehicles", icon: Bus },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open admin menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[85vw] max-w-[320px] transform flex-col border-r border-outline-variant/30 bg-surface-container-low shadow-2xl transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "pointer-events-none -translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        aria-hidden={!open}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-outline-variant/30">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="text-xl font-headline font-extrabold tracking-tighter text-primary"
          >
            Uhambo
            <span className="text-on-surface-variant/60 font-medium ml-1.5 text-xs uppercase tracking-[0.2em]">
              Admin
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <ul className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container"
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
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close admin menu backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}
    </>
  );
}
