import { createElement } from 'react';
import { ChevronRight } from 'lucide-react';

export default function SettingsItem({
    icon,
    label,
    isSwitch,
    switchValue,
    onSwitchChange,
    onClick,
    iconColor,
    className = '',
    labelClassName = '',
}) {
    const renderedIcon = icon ? createElement(icon, { size: 18 }) : null;

    return (
        <button className={`settings-item ${className}`.trim()} onClick={isSwitch ? undefined : onClick} style={isSwitch ? { cursor: 'default' } : {}}>
            <span className="settings-item-icon" style={iconColor ? { background: `${iconColor}15`, color: iconColor } : {}}>
                {renderedIcon}
            </span>
            <span className={`settings-item-label ${labelClassName}`.trim()}>{label}</span>
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
