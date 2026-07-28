import { statusBadgeClass, statusLabel } from "@/lib/status";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
        status
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}
