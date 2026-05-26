const normalizeVehicleType = (type) => {
    if (!type) return ''

    if (typeof type === 'string') {
        return type.trim().toLowerCase()
    }

    return String(type.name || type.display_name || '').trim().toLowerCase()
}

export const resolveVehicleTypeIcon = (type) => {
    const value = normalizeVehicleType(type)

    if (value.includes('tuk') || value.includes('rickshaw') || value.includes('three')) return 'local_taxi'
    if (value.includes('bike') || value.includes('motorcycle') || value.includes('motorbike')) return 'two_wheeler'
    if (value.includes('van') || value.includes('minivan') || value.includes('shuttle')) return 'airport_shuttle'
    if (value.includes('suv') || value.includes('jeep')) return 'directions_car'
    if (value.includes('truck') || value.includes('pickup') || value.includes('flex')) return 'local_shipping'
    if (value.includes('bus') || value.includes('coach')) return 'directions_bus'
    if (value.includes('lux') || value.includes('premium') || value.includes('vip')) return 'directions_car'

    return 'directions_car'
}

export const resolveVehicleTypeLabel = (type) => {
    if (!type) return 'Vehicle'

    if (typeof type === 'string') {
        return type
    }

    return type.display_name || type.name || 'Vehicle'
}

const VehicleTypeIcon = ({
    type,
    size = 18,
    showLabel = false,
    compact = false,
    label,
    className = '',
    style = {},
    labelStyle = {},
}) => {
    const iconName = resolveVehicleTypeIcon(type)
    const resolvedLabel = label || resolveVehicleTypeLabel(type)

    return (
        <span
            className={`vehicle-type-icon ${compact ? 'compact' : ''} ${className}`.trim()}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: showLabel ? 8 : 0,
                padding: compact ? '0' : '8px 10px',
                borderRadius: compact ? 0 : 12,
                background: compact ? 'transparent' : '#f8fafc',
                border: compact ? 'none' : '1px solid var(--border, #e2e8f0)',
                color: 'var(--text-dark, #1e293b)',
                ...style,
            }}
            title={resolvedLabel}
            aria-label={resolvedLabel}
        >
            <span
                className="material-icons"
                style={{ fontSize: size, color: '#0f766e', fontFamily: 'Material Icons' }}
            >
                {iconName}
            </span>
            {showLabel && <span style={{ fontWeight: 600, textTransform: 'capitalize', ...labelStyle }}>{resolvedLabel}</span>}
        </span>
    )
}

export default VehicleTypeIcon