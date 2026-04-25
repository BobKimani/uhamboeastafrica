import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <>
      <AdminHeader
        title="Settings"
        description="Workspace, team and notification preferences."
      />
      <main className="p-4 md:p-8">
        <div className="max-w-3xl flex flex-col gap-6">
          <SettingsSection
            title="Organisation"
            description="The details shown on booking confirmations and invoices."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company name" htmlFor="org-name">
                <Input id="org-name" defaultValue="Uhambo East Africa" />
              </Field>
              <Field label="Support email" htmlFor="org-email">
                <Input
                  id="org-email"
                  type="email"
                  defaultValue="hello@uhambo.africa"
                />
              </Field>
              <Field label="Phone" htmlFor="org-phone">
                <Input id="org-phone" defaultValue="+254 700 000 000" />
              </Field>
              <Field label="Base currency" htmlFor="org-currency">
                <Input id="org-currency" defaultValue="USD" />
              </Field>
            </div>
            <Field label="Tagline" htmlFor="org-tagline">
              <Textarea
                id="org-tagline"
                defaultValue="Tailored safaris, transport and stays across Kenya, Tanzania, Uganda and Rwanda."
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            description="Where operator alerts are delivered."
          >
            <ToggleRow
              label="New booking alerts"
              hint="Email when a new booking is submitted."
              defaultChecked
            />
            <ToggleRow
              label="Payment confirmations"
              hint="Email when a deposit clears."
              defaultChecked
            />
            <ToggleRow
              label="Weekly digest"
              hint="Summary of bookings, revenue and fleet utilisation."
            />
          </SettingsSection>

          <SettingsSection
            title="Danger zone"
            description="Actions that affect the whole workspace."
            tone="danger"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-on-surface">
                  Export booking archive
                </p>
                <p className="text-sm text-on-surface-variant">
                  Download every booking as CSV.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <Button size="sm">Save changes</Button>
          </div>
        </div>
      </main>
    </>
  );
}

function SettingsSection({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`s-${title}`}
      className="bg-surface-container-lowest border border-outline-variant/25 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-outline-variant/25">
        <h2
          id={`s-${title}`}
          className={
            tone === "danger"
              ? "text-base font-headline font-bold text-error"
              : "text-base font-headline font-bold text-on-surface"
          }
        >
          {title}
        </h2>
        <p className="text-sm text-on-surface-variant mt-0.5">{description}</p>
      </div>
      <div className="p-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  defaultChecked,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="font-medium text-on-surface">{label}</p>
        <p className="text-sm text-on-surface-variant">{hint}</p>
      </div>
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 mt-1">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-surface-container-high peer-checked:bg-primary transition-colors"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
