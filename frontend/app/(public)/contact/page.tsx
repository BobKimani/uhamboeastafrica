import { Phone, Mail, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/contact-form";

const CONTACT_ITEMS = [
  {
    icon: Phone,
    label: "Phone",
    value: "+254 750 811 117",
    hint: "Mon–Sat, 8am – 6pm EAT",
  },
  {
    icon: Mail,
    label: "Email",
    value: "Jackndungu3@gmail.com",
    hint: "We reply within 24 hours",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon – Sat · 8:00 – 18:00",
    hint: "Sunday — by request",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen pb-24">
      <header className="pt-24 pb-10 px-6 md:px-10 max-w-5xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Contact
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.1]">
          Let&apos;s build your
          <br /> next journey
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          Questions, custom trips, big groups. We read every message.
        </p>
      </header>

      <section className="max-w-6xl mx-auto px-6 md:px-10 mt-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <ContactForm />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-8 border border-outline-variant/15">
            <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
              Reach us
            </span>
            <h2 className="text-2xl font-headline font-extrabold tracking-tight text-on-background mt-2">
              The direct line
            </h2>
            <div className="mt-6 flex flex-col gap-5">
              {CONTACT_ITEMS.map(({ icon: Icon, label, value, hint }) => (
                <div key={label} className="flex gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {label}
                    </p>
                    <p className="text-on-surface font-bold mt-0.5">{value}</p>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                      {hint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </section>
    </div>
  );
}
