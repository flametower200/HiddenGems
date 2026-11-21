function FootIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3.5c-1.6 0-2.7 2-2.7 4.4 0 2.6 1.2 4.2 2.9 4.2 1.3 0 2.4-1.1 2.6-2.8.4-2.5-1-5.8-2.8-5.8ZM15 12.5c-2 0-3.5 2-3.5 4.3 0 2.2 1.2 3.7 3.2 3.7 2 0 4.3-1.4 4.3-3.3 0-2-2.1-4.7-4-4.7Z" fill="currentColor" />
    </svg>
  );
}

export default function ProfileStatGrid({ items }) {
  return (
    <div className="profile-stat-grid">
      {items.map(({ label, value, icon, available }) => (
        <div className="profile-stat-tile" key={label}>
          <span className="profile-stat-tile__label">{label}</span>
          <strong className="profile-stat-tile__value">
            {icon === 'foot' && <FootIcon />}
            {typeof available === 'boolean' && (
              <span className={`profile-stat-tile__status${available ? ' is-available' : ''}`} aria-hidden="true" />
            )}
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}
