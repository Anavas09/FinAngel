interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => (
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
