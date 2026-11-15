export default function KLogoBadge({ size = "sm", className = "" }) {
  const sizeClass =
    size === "xs"
      ? "h-4 w-3.5"
      : size === "md"
      ? "h-6 w-5"
      : "h-5 w-4";

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none absolute top-1.5 left-1.5 z-10 inline-flex items-center justify-center drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] ${className}`}
    >
      <svg
        viewBox="0 0 24 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizeClass}
      >
        {/* Batang kiri K ala Netflix */}
        <path d="M3 2H8.5V28H3V2Z" fill="#B20710" />
        {/* Sayap diagonal K */}
        <path d="M21 2H14.2L8.5 14.5L14.5 28H21.2L14.4 14.5L21 2Z" fill="#E50914" />
        {/* Highlight tipis batang kiri */}
        <path d="M3 2H5.6V28H3V2Z" fill="#FF1E2B" fillOpacity="0.85" />
      </svg>
    </span>
  );
}
