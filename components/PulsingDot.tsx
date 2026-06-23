import { twMerge } from "tailwind-merge";

interface PulsingDotProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PulsingDot({
  size = 8,
  className,
  ariaLabel = "Unread indicator",
}: PulsingDotProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={twMerge(
        "inline-block rounded-full bg-red-500 pulse-ring",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
