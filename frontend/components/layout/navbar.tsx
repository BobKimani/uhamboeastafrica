"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { IMG } from "@/lib/images";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/plan-trip", label: "Plan Trip" },
  { href: "/transport", label: "Transport" },
  { href: "/destinations", label: "Destinations" },
  { href: "/experiences", label: "Experiences" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "bg-background/80 backdrop-blur-xl",
        scrolled && "shadow-[0_8px_30px_rgba(27,28,26,0.04)]"
      )}
    >
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 md:px-10">
        <Link href="/" aria-label="Uhambo East Africa — Home">
          <Image
            src={IMG.logo}
            alt="Uhambo East Africa"
            width={44}
            height={44}
            loading="eager"
          />
        </Link>

        <div className="hidden lg:flex items-center gap-7 font-headline tracking-wide">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors duration-300",
                isActive(item.href)
                  ? "text-primary border-b-2 border-primary pb-0.5 font-bold"
                  : "text-on-surface-variant hover:text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((current) => !current)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-y-auto bg-[#1b1c1a] px-6 pb-8 text-white lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15">
            <Link
              href="/"
              aria-label="Uhambo East Africa — Home"
              onClick={() => setOpen(false)}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white">
                <Image
                  src={IMG.logo}
                  alt=""
                  width={34}
                  height={34}
                  loading="eager"
                />
              </span>
              <span className="font-headline text-lg font-extrabold tracking-tight text-white">
                Uhambo
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle className="text-white hover:bg-white/10 hover:text-inverse-primary" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <ul className="flex flex-1 flex-col justify-center gap-2 py-8 font-headline tracking-wide">
            {NAV.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-lg font-semibold transition-colors",
                      active
                        ? "bg-white/10 text-inverse-primary"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 flex-col gap-3 border-t border-white/15 pt-6">
            <Link
              href="/plan-trip"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary-container"
            >
              Plan My Trip
            </Link>
            <Link
              href="/transport"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Book Transport
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
