"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import {
  TableCard,
  TableToolbar,
  Table,
  Th,
  Td,
  TableEmpty,
} from "@/components/admin/data-table";
import {
  fetchAdminInquiries,
  updateInquiryStatus,
  deleteInquiry,
} from "@/lib/api/inquiries";
import type { Inquiry, InquiryStatus } from "@/types/inquiry";
import { cn, formatTimestamp } from "@/lib/utils";

const ALL_STATUSES: InquiryStatus[] = ["new", "read", "replied", "archived"];
const FILTERS: ("all" | InquiryStatus)[] = ["all", ...ALL_STATUSES];

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant ring-1 ring-inset ring-tertiary-fixed-dim/50",
  read: "bg-secondary-container text-on-secondary-container ring-1 ring-inset ring-outline-variant/60",
  replied: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  archived: "bg-surface-container-low text-on-surface-variant ring-1 ring-inset ring-outline-variant/30",
};

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function InquiryStatusPill({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold",
        STATUS_STYLES[status]
      )}
    >
      {formatLabel(status)}
    </span>
  );
}

export function InquiriesTable() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminInquiries();
      setInquiries(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load inquiries."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(id: string, status: InquiryStatus) {
    setUpdatingId(id);
    const previous = inquiries;
    setInquiries((rows) =>
      rows.map((i) => (i.id === id ? { ...i, status } : i))
    );
    try {
      await updateInquiryStatus(id, status);
    } catch (error) {
      setInquiries(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(inquiry: Inquiry) {
    const confirmed = window.confirm(
      `Delete inquiry from ${inquiry.fullName}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(inquiry.id);
    const previous = inquiries;
    setInquiries((rows) => rows.filter((i) => i.id !== inquiry.id));

    try {
      await deleteInquiry(inquiry.id);
    } catch (error) {
      setInquiries(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete inquiry."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      if (filter !== "all" && inquiry.status !== filter) return false;
      if (!q) return true;
      return (
        inquiry.fullName.toLowerCase().includes(q) ||
        inquiry.email.toLowerCase().includes(q) ||
        inquiry.contact.toLowerCase().includes(q) ||
        inquiry.message.toLowerCase().includes(q)
      );
    });
  }, [inquiries, query, filter]);

  return (
    <TableCard>
      <TableToolbar>
        <div className="flex items-center h-10 w-full md:w-96 gap-2 px-3 rounded-xl bg-surface-container-low text-on-surface-variant">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, contact, message..."
            aria-label="Search inquiries"
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            aria-label="Refresh inquiries"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low overflow-x-auto"
          >
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  filter === item
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {formatLabel(item)}
              </button>
            ))}
          </div>
        </div>
      </TableToolbar>

      {errorMessage && (
        <div className="flex items-start gap-2 px-5 py-3 text-sm text-red-500 border-b border-outline-variant/25" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <TableEmpty message="Loading inquiries..." />
      ) : rows.length === 0 ? (
        <TableEmpty
          message={
            inquiries.length === 0
              ? "No inquiries yet."
              : "No inquiries match your filters."
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Sender</Th>
              <Th>Email</Th>
              <Th>Contact</Th>
              <Th>Message</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inquiry) => (
              <tr
                key={inquiry.id}
                className="hover:bg-surface-container-low/60 transition-colors align-top"
              >
                <Td>
                  <span className="font-medium">{inquiry.fullName}</span>
                </Td>
                <Td>{inquiry.email}</Td>
                <Td className="text-on-surface-variant">{inquiry.contact}</Td>
                <Td className="max-w-md whitespace-normal text-on-surface-variant">
                  {inquiry.message}
                </Td>
                <Td className="text-on-surface-variant">
                  {formatTimestamp(inquiry.createdAt)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <InquiryStatusPill status={inquiry.status} />
                    <select
                      aria-label={`Change status for ${inquiry.fullName}`}
                      value={inquiry.status}
                      disabled={updatingId === inquiry.id}
                      onChange={(e) =>
                        void handleStatusChange(
                          inquiry.id,
                          e.target.value as InquiryStatus
                        )
                      }
                      className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low text-on-surface border border-outline-variant/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => void handleDelete(inquiry)}
                    disabled={deletingId === inquiry.id}
                    aria-label={`Delete inquiry from ${inquiry.fullName}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="px-5 py-3 border-t border-outline-variant/25 text-xs text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{rows.length}</span>{" "}
        of {inquiries.length} inquiries
      </div>
    </TableCard>
  );
}
