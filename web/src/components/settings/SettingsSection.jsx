export default function SettingsSection({ title, children }) {
    return (
        <div className="settings-section">
            <div className="settings-section-title">{title}</div>
            <div className="settings-section-body">{children}</div>
        </div>
    );
}
