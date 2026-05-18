import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useAdmin } from '../context/AdminContext'
import { fetchRolePermissions, updateRolePermissions } from '../services/adminApi'
import './Permissions.css'

const Permissions = () => {
    const { token, admin } = useAdmin()
    const [roles, setRoles] = useState([])
    const [availablePermissions, setAvailablePermissions] = useState([])
    const [selectedRole, setSelectedRole] = useState('admin')
    const [draftPermissions, setDraftPermissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const isLockedRole = selectedRole === 'super_admin'

    useEffect(() => {
        const loadPermissions = async () => {
            if (!token) return

            try {
                setLoading(true)
                const data = await fetchRolePermissions(token)
                setRoles(data.roles || [])
                setAvailablePermissions(data.available_permissions || [])
            } catch (error) {
                Swal.fire('Error', error.message || 'Failed to load permissions', 'error')
            } finally {
                setLoading(false)
            }
        }

        loadPermissions()
    }, [token])

    useEffect(() => {
        const role = roles.find((item) => item.role === selectedRole)
        setDraftPermissions(role?.permissions || [])
    }, [roles, selectedRole])

    const roleCards = useMemo(() => roles, [roles])

    const handleTogglePermission = (permission) => {
        setDraftPermissions((current) => {
            if (current.includes(permission)) {
                return current.filter((item) => item !== permission)
            }

            return [...current, permission]
        })
    }

    const handleSave = async () => {
        if (!selectedRole) return
        if (isLockedRole) {
            Swal.fire('Notice', 'Super Admin permissions are fixed.', 'info')
            return
        }

        setSaving(true)
        try {
            await updateRolePermissions(token, selectedRole, draftPermissions)
            setRoles((current) => current.map((role) => (
                role.role === selectedRole
                    ? { ...role, permissions: draftPermissions }
                    : role
            )))
            Swal.fire('Saved', 'Role permissions updated successfully.', 'success')
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to update permissions', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (admin?.role !== 'super_admin') {
        return (
            <section className="content-page">
                <div className="permissions-empty-state">
                    <h2>Access restricted</h2>
                    <p>Only the super admin can manage role permissions.</p>
                </div>
            </section>
        )
    }

    return (
        <section className="content-page permissions-page">
            <div className="permissions-layout">
                <div className="permissions-roles-panel">
                    <div className="permissions-panel-header">
                        <div>
                            <p className="eyebrow">Role access</p>
                            <h3>Manage permissions</h3>
                        </div>
                        <span className="permissions-count">{availablePermissions.length} permissions</span>
                    </div>

                    <div className="permissions-role-list">
                        {loading ? (
                            <div className="permissions-placeholder">Loading roles...</div>
                        ) : roleCards.length === 0 ? (
                            <div className="permissions-placeholder">No roles found.</div>
                        ) : (
                            roleCards.map((role) => (
                                <button
                                    key={role.role}
                                    type="button"
                                    className={`permission-role-card ${selectedRole === role.role ? 'active' : ''}`}
                                    onClick={() => setSelectedRole(role.role)}
                                >
                                    <span className="permission-role-name">{role.label}</span>
                                    <span className="permission-role-meta">
                                        {role.permissions?.length || 0} assigned
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="permissions-editor-panel">
                    <div className="permissions-panel-header">
                        <div>
                            <p className="eyebrow">Selected role</p>
                            <h3>{roleCards.find((item) => item.role === selectedRole)?.label || 'Role'}</h3>
                        </div>
                        <button type="button" className="btn-signin" onClick={handleSave} disabled={saving || loading || isLockedRole} style={{ width: 'auto', padding: '12px 22px' }}>
                            {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>

                    {isLockedRole && (
                        <div className="permissions-placeholder" style={{ minHeight: 0, marginBottom: 20 }}>
                            Super Admin permissions are always full access.
                        </div>
                    )}

                    <div className="permissions-grid">
                        {availablePermissions.map((permission) => {
                            const checked = draftPermissions.includes(permission)
                            return (
                                <label key={permission} className={`permission-toggle ${checked ? 'checked' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isLockedRole}
                                        onChange={() => handleTogglePermission(permission)}
                                    />
                                    <span>
                                        <strong>{permission.replace(/_/g, ' ')}</strong>
                                        <small>Grant this capability to the role.</small>
                                    </span>
                                </label>
                            )
                        })}
                    </div>

                    <div className="permissions-summary">
                        <div>
                            <label>Super Admin</label>
                            <span>Always has full access</span>
                        </div>
                        <div>
                            <label>Selected role</label>
                            <span>{selectedRole.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                            <label>Assigned permissions</label>
                            <span>{draftPermissions.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Permissions
