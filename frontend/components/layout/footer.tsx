import Link from "next/link";
import { Mail, Phone } from "lucide-react";

const IG = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const FB = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const TT = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const SOCIAL = [
  { href: "https://www.instagram.com/eastafricasafari/", icon: IG, label: "Instagram" },
  { href: "https://facebook.com", icon: FB, label: "Facebook" },
  { href: "https://www.tiktok.com/@uhamboeastafrica", icon: TT, label: "TikTok" },
];

const LINKS = [
  { href: "/plan-trip", label: "Plan Trip" },
  { href: "/transport", label: "Transport" },
  { href: "/experiences", label: "Experiences" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-8 py-16 grid md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="text-primary font-headline font-extrabold text-2xl mb-3">
            Uhambo
          </div>
          <p className="text-secondary max-w-sm leading-relaxed">
            Tailored safaris, seamless transport and curated stays across Kenya,
            Tanzania and Uganda. The breath of the savanna.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {SOCIAL.map(({ href, icon: Icon, label }) => (
              <a
                key={href}
                href={href}
                aria-label={label}
                className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-headline font-bold text-on-surface mb-4">
            Explore
          </h4>
          <ul className="space-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-secondary hover:text-primary transition-colors text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-headline font-bold text-on-surface mb-4">
            Contact
          </h4>
          <ul className="space-y-3 text-sm text-secondary">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              +254 795 337 981
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Jackndungu3@gmail.com
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-widest text-secondary">
            © 2026 Uhambo East Africa. The Breath of the Savanna.
          </p>
          <div className="flex gap-6 text-xs uppercase tracking-widest">
            <Link href="#" className="text-secondary hover:text-primary">
              Privacy
            </Link>
            <Link href="#" className="text-secondary hover:text-primary">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
