"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

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

  useEffect(() => setOpen(false), [pathname]);

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
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        <Link
          href="/"
          className="text-2xl font-headline font-extrabold tracking-tighter text-primary"
        >
          Uhambo
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
          <Button size="sm" className="hidden md:inline-flex">
            Login
          </Button>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 text-on-surface"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-t border-outline-variant/10">
          <div className="flex flex-col px-6 py-4 gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "py-3 px-3 rounded-xl font-headline text-base transition-all",
                  isActive(item.href)
                    ? "bg-surface-container-low text-primary font-bold"
                    : "text-on-surface hover:bg-surface-container-low"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button className="mt-3 w-full">Login</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
