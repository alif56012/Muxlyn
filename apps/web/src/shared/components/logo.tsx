interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 32"
      fill="none"
      className={className}
      aria-label="Muxlyn"
    >
      <polygon
        points="0,24 0,2 7,13 10,2 10,13 17,24 17,14 10,6 7,14 5,8 5,24"
        className="fill-primary"
      />
      <text
        x="26"
        y="24"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="20"
        letterSpacing="-0.02em"
        className="fill-foreground"
      >
        Muxlyn
      </text>
    </svg>
  );
}

export function LogoIcon({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 24"
      fill="none"
      className={className}
      aria-label="Muxlyn"
    >
      <polygon
        points="0,24 0,2 6,13 8,2 8,13 14,24 14,14 8,6 6,14 4,8 4,24"
        className="fill-primary"
      />
    </svg>
  );
}
