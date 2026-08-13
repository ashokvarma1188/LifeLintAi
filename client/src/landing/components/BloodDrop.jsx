/** The LifeLink mark: a blood drop with a radial gradient and a specular highlight. */
function BloodDrop({ className = "", size = 32 }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 32 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ll-drop-grad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="oklch(0.85 0.2 27)" />
          <stop offset="60%" stopColor="oklch(0.6 0.27 27)" />
          <stop offset="100%" stopColor="oklch(0.35 0.2 27)" />
        </radialGradient>
      </defs>
      <path
        d="M16 1 C 16 1, 30 18, 30 28 A 14 14 0 1 1 2 28 C 2 18, 16 1, 16 1 Z"
        fill="url(#ll-drop-grad)"
      />
      <ellipse
        cx="11"
        cy="22"
        rx="3"
        ry="5"
        fill="oklch(0.95 0.05 27 / 0.6)"
        transform="rotate(-20 11 22)"
      />
    </svg>
  );
}

export default BloodDrop;
