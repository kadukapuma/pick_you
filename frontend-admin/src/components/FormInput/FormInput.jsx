import './FormInput.css'

const FormInput = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    required = false,
    disabled = false,
    ...props
}) => {
    return (
        <div className="form-input-group">
            {label && (
                <label htmlFor={name} className="form-input-label">
                    {label}
                    {required && <span className="form-input-required">*</span>}
                </label>
            )}
            <input
                id={name}
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`form-input ${error ? 'form-input--error' : ''}`}
                {...props}
            />
            {error && <span className="form-input-error">{error}</span>}
        </div>
    )
}

export default FormInput
