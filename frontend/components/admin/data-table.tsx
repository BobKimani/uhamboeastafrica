import { cn } from "@/lib/utils";

export function TableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 bg-surface-container-lowest border border-outline-variant/25 rounded-2xl overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TableToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-outline-variant/25 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
      {children}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-max w-full text-sm text-left border-collapse">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant whitespace-nowrap bg-surface-container-low/40",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-5 py-4 text-on-surface whitespace-nowrap border-t border-outline-variant/20",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TableEmpty({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-on-surface-variant">
      {message}
    </div>
  );
}
