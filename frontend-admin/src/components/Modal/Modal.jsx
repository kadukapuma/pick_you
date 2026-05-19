import './Modal.css'

const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    size = 'medium',
    showHeader = true,
}) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-container modal-container--${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                {showHeader && (
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">{title}</h2>
                            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
                        </div>
                        <button className="modal-close" onClick={onClose}>
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                )}
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
