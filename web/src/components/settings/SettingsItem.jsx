import { ChevronRight } from 'lucide-react';

export default function SettingsItem({ icon: Icon, label, isSwitch, switchValue, onSwitchChange, onClick, iconColor }) {
    return (
        <button className="settings-item" onClick={isSwitch ? undefined : onClick} style={isSwitch ? { cursor: 'default' } : {}}>
            <span className="settings-item-icon" style={iconColor ? { background: `${iconColor}15`, color: iconColor } : {}}>
                <Icon size={18} />
            </span>
            <span className="settings-item-label">{label}</span>
            {isSwitch ? (
                <button
                    className={`settings-switch ${switchValue ? 'on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onSwitchChange?.(); }}
                >
                    <span className="settings-switch-knob" />
                </button>
            ) : (
                <ChevronRight size={18} className="settings-item-chevron" />
            )}
        </button>
    );
}
