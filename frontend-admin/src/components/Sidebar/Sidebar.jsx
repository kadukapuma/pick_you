import { NavLink } from 'react-router-dom'
import logo from '../../assets/logo.png'
import './Sidebar.css'

const Sidebar = ({ admin, isCollapsed }) => {
    const adminName = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : 'Admin User'
    const adminInitial = admin?.first_name?.charAt(0) || 'A'
    const canManagePermissions = admin?.role === 'super_admin'
    const canManageOperators =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('create_operators') ||
        admin?.permissions?.includes('manage_operators')
    const canManageDrivers = admin?.role === 'super_admin' || admin?.permissions?.includes('manage_drivers')
    const canManageVehicles = admin?.role === 'super_admin' || admin?.permissions?.includes('manage_vehicles')
    const canManageVehicleTypes = admin?.role === 'super_admin' || admin?.permissions?.includes('manage_vehicle_types')
    const canManagePassengers = admin?.role === 'super_admin' || admin?.permissions?.includes('manage_passengers')
    const canManageFare = admin?.role === 'super_admin' || admin?.permissions?.includes('manage_fare_configs')

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
                <img src={logo} alt="Pick You" className="brand-logo" />
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/admin-portal" end>
                    <span className="material-icons">dashboard</span>
                    <span>Dashboard</span>
                </NavLink>
                {canManagePassengers && (
                    <NavLink to="/admin-portal/customers">
                        <span className="material-icons">person_outline</span>
                        <span>Passengers</span>
                    </NavLink>
                )}
                {canManageDrivers && (
                    <NavLink to="/admin-portal/drivers">
                        <span className="material-icons">group</span>
                        <span>Drivers</span>
                    </NavLink>
                )}
                {canManageVehicles && (
                    <NavLink to="/admin-portal/vehicles">
                        <span className="material-icons">directions_car</span>
                        <span>Vehicles</span>
                    </NavLink>
                )}
                {canManageVehicleTypes && (
                    <NavLink to="/admin-portal/vehicle-types">
                        <span className="material-icons">local_taxi</span>
                        <span>Vehicle Types</span>
                    </NavLink>
                )}
                {canManageFare && (
                    <NavLink to="/admin-portal/fare-configs">
                        <span className="material-icons">payments</span>
                        <span>Fare Configs</span>
                    </NavLink>
                )}
                {canManageOperators && (
                    <NavLink to="/admin-portal/operators">
                        <span className="material-icons">admin_panel_settings</span>
                        <span>Operators</span>
                    </NavLink>
                )}
                {canManagePermissions && (
                    <NavLink to="/admin-portal/permissions">
                        <span className="material-icons">security</span>
                        <span>Permissions</span>
                    </NavLink>
                )}
                <NavLink to="/admin-portal/reports">
                    <span className="material-icons">analytics</span>
                    <span>Reports</span>
                </NavLink>
                {admin?.role === 'super_admin' && (
                    <NavLink to="/admin-portal/admins">
                        <span className="material-icons">manage_accounts</span>
                        <span>Admins</span>
                    </NavLink>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="avatar-initials" style={{ width: 40, height: 40 }}>
                    {adminInitial}
                </div>
                <div className="sidebar-user-info">
                    <strong>{adminName}</strong>
                    <p>{admin?.role}</p>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
