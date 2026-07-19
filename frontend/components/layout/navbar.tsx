"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const open = openPathname === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            src="/assets/uhambo-logo-v2.png"
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
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() =>
              setOpenPathname((current) => (current === pathname ? null : pathname))
            }
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-outline-variant/30 bg-background/95 px-6 pb-6 pt-2 shadow-[0_16px_30px_rgba(27,28,26,0.08)] backdrop-blur-xl"
        >
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 font-headline tracking-wide">
            {NAV.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenPathname(null)}
                    className={cn(
                      "block rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
