import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AdminMobileNav } from "./mobile-nav";

export function AdminHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-8 border-b border-outline-variant/30 bg-background/85 backdrop-blur-xl">
      <AdminMobileNav />

      <div className="min-w-0 flex-1">
        <h1 className="text-base md:text-lg font-headline font-bold text-on-surface truncate">
          {title}
        </h1>
        {description && (
          <p className="hidden md:block text-xs text-on-surface-variant truncate">
            {description}
          </p>
        )}
      </div>

      <div className="hidden md:flex items-center h-10 w-72 gap-2 px-3 rounded-xl bg-surface-container-low text-on-surface-variant">
        <Search className="h-4 w-4" aria-hidden />
        <input
          type="search"
          placeholder="Search bookings, hotels…"
          aria-label="Search"
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
        />
        <kbd className="hidden lg:inline-flex h-5 items-center px-1.5 text-[10px] font-mono text-on-surface-variant/80 bg-surface-container rounded">
          ⌘K
        </kbd>
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors"
      >
        <Bell className="h-5 w-5" />
        <span
          aria-hidden
          className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
        />
      </button>

      <ThemeToggle />
    </header>
  );
}
