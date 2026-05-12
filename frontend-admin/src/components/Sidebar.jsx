import { NavLink } from 'react-router-dom'
import { resolveAssetUrl } from '../services/adminApi'
import logo from '../assets/logo.png'
import './Sidebar.css'

const Sidebar = ({ admin, isCollapsed }) => {
    const adminName = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : 'Admin User'
    const adminInitial = admin?.first_name?.charAt(0) || 'A'

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
                <img src={logo} alt="Pick You" className="brand-logo" />
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/">
                    <span className="material-icons">dashboard</span>
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/customers">
                    <span className="material-icons">person_outline</span>
                    <span>Passengers</span>
                </NavLink>
                <NavLink to="/drivers">
                    <span className="material-icons">group</span>
                    <span>Drivers</span>
                </NavLink>
                <NavLink to="/vehicles">
                    <span className="material-icons">directions_car</span>
                    <span>Vehicles</span>
                </NavLink>
                {admin?.role === 'super_admin' && (
                    <NavLink to="/admins">
                        <span className="material-icons">admin_panel_settings</span>
                        <span>Manage Admins</span>
                    </NavLink>
                )}
                <NavLink to="/settings">
                    <span className="material-icons">settings</span>
                    <span>Settings</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="avatar-initials avatar-green">
                    {admin?.profile_picture_path ? (
                        <img src={resolveAssetUrl(admin.profile_picture_path)} alt={adminName} />
                    ) : (
                        adminInitial
                    )}
                </div>
                <div className="sidebar-user-info">
                    <strong>{adminName}</strong>
                    <p>{admin?.email || 'admin@pickyou.lk'}</p>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
