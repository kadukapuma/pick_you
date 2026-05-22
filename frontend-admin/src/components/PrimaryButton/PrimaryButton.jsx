import './PrimaryButton.css'

const PrimaryButton = ({
    children,
    onClick,
    disabled = false,
    type = 'button',
    icon = null,
    variant = 'primary',
    style = {},
    ...props
}) => {
    return (
        <button
            type={type}
            className={`primary-btn primary-btn--${variant}`}
            onClick={onClick}
            disabled={disabled}
            style={style}
            {...props}
        >
            {icon && <span className="material-icons btn-icon">{icon}</span>}
            <span className="btn-text">{children}</span>
        </button>
    )
}

export default PrimaryButton
