import PrimaryButton from '../PrimaryButton/PrimaryButton'
import './FormActions.css'

const FormActions = ({
    onSubmit,
    onCancel,
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    isLoading = false,
    submitDisabled = false,
}) => {
    return (
        <div className="form-actions">
            <PrimaryButton
                variant="secondary"
                onClick={onCancel}
                disabled={isLoading}
            >
                {cancelLabel}
            </PrimaryButton>
            <PrimaryButton
                onClick={onSubmit}
                disabled={isLoading || submitDisabled}
            >
                {isLoading ? (
                    <>
                        <span className="material-icons loading-spinner">sync</span>
                        {submitLabel}
                    </>
                ) : (
                    submitLabel
                )}
            </PrimaryButton>
        </div>
    )
}

export default FormActions
