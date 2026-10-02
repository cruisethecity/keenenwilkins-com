import { motion } from "motion/react";

/**
 * Live Telemetry badge.
 *
 * The visitor counter, dressed as a status indicator rather than a hit
 * counter. The pulsing dot carries the state: green and breathing means the
 * DynamoDB read came back, amber means the API did not answer, gray means the
 * API URL was never configured at build time.
 *
 * The dot is two elements, not one. A solid core plus a scaling ring is what
 * makes it read as a signal instead of a blinking light.
 *
 * Telemetry arrives as a prop rather than from a hook call inside this
 * component, because the badge renders twice on the page. Two hook instances
 * would mean two requests and, on a first visit, a race to increment twice.
 *
 * The `onDark` prop exists because this badge sits in the charcoal global nav
 * and again in the light footer. It is the one component on the page that
 * cannot use the band variables, since the global nav is fixed chrome rather
 * than a band.
 */

const LABELS = {
  loading: "Connecting",
  ready: "Live",
  error: "Telemetry offline",
  unconfigured: "Telemetry not configured",
};

export default function TelemetryBadge({ telemetry, compact = false, onDark = false }) {
  const { status, count } = telemetry;
  const isLive = status === "ready";

  const surface = onDark
    ? "border-white/15 bg-white/8"
    : "border-rule bg-black/4";
  const labelInk = onDark ? "text-white/65" : "text-muted";
  const valueInk = onDark ? "text-white" : "text-ink";
  const unitInk = onDark ? "text-white/45" : "text-faint";

  const dotFill = {
    loading: onDark ? "bg-white/40" : "bg-faint",
    ready: onDark ? "bg-signal-dark" : "bg-signal",
    error: onDark ? "bg-amber-dark" : "bg-amber",
    unconfigured: onDark ? "bg-white/30" : "bg-rule",
  }[status] ?? "bg-faint";

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 ${surface}`}
      role="status"
      aria-live="polite"
      title={
        isLive
          ? `${count.toLocaleString("en-US")} visits recorded in DynamoDB`
          : LABELS[status]
      }
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {isLive && (
          <motion.span
            className={`absolute inset-0 rounded-full ${dotFill}`}
            animate={{ scale: [1, 2.8, 2.8], opacity: [0.6, 0, 0] }}
            transition={{
              duration: 2.1,
              repeat: Infinity,
              ease: "easeOut",
              times: [0, 0.7, 1],
            }}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotFill}`} />
      </span>

      {!compact && (
        <span className={`hidden text-[11px] tracking-tight sm:inline ${labelInk}`}>
          {LABELS[status]}
        </span>
      )}

      <span className={`text-[11px] font-medium tabular-nums ${valueInk}`}>
        {isLive ? count.toLocaleString("en-US") : "·····"}
      </span>

      {!compact && (
        <span className={`hidden text-[11px] md:inline ${unitInk}`}>visits</span>
      )}
    </div>
  );
}
