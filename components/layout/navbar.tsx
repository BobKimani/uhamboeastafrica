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
            aria-label="Toggle menu"
            onClick={() => setOpenPathname((path) => (path ? null : pathname))}
            className="lg:hidden p-2 text-on-surface"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
