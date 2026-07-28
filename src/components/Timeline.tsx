import { MILESTONES } from "@/lib/status";
import { formatDate } from "@/lib/format";

export type TimelineState = {
  po_sent: boolean;
  order_confirmed: boolean;
  expected_shipping: boolean;
  expected_arrival: boolean;
  arrived: boolean;
};

export default function Timeline({
  state,
  shippingDate,
  arrivalDate,
}: {
  state: TimelineState;
  shippingDate: string | null;
  arrivalDate: string | null;
}) {
  const done: Record<string, boolean> = state as unknown as Record<string, boolean>;
  const sub: Record<string, string | null> = {
    expected_shipping: shippingDate ? formatDate(shippingDate) : null,
    expected_arrival: arrivalDate ? formatDate(arrivalDate) : null,
  };

  return (
    <ol className="relative space-y-5">
      {MILESTONES.map((m, i) => {
        const isDone = done[m.key];
        const isLast = i === MILESTONES.length - 1;
        return (
          <li key={m.key} className="relative flex gap-3">
            {!isLast && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  isDone ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={`z-10 flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${
                isDone
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-slate-300 bg-white text-slate-300"
              }`}
            >
              {isDone ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.29 6.8-6.8a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              )}
            </span>
            <div className="pb-1">
              <div
                className={`text-sm font-semibold ${
                  isDone ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {m.label}
              </div>
              {sub[m.key] && (
                <div className="text-xs text-slate-500">{sub[m.key]}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
