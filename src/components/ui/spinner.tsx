export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`motion-spinner inline-block rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
