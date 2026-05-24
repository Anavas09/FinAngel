export const Toggle = ({ checked, onChange, label }) => (
  <button
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="fa-toggle"
    data-on={checked}
  >
    <span className="fa-toggle-dot" />
  </button>
);
