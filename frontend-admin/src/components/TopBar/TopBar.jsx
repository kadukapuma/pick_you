import { NavLink } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import './TopBar.css'

const TopBar = ({
    admin,
    onToggleSidebar,
    isSidebarCollapsed,
    onSignOut,
    notifications = [],
    unreadCount = 0,
    onMarkAllRead,
    onClearNotifications,
}) => {
    const [showNotifications, setShowNotifications] = useState(false)
    const notificationRef = useRef(null)

    const adminName = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : 'Admin User'
    const adminInitial = admin?.first_name?.charAt(0) || 'A'

    const getPageName = () => {
        const path = window.location.pathname
        if (path === '/') return 'Dashboard'
        if (path === '/customers') return 'Passengers'
        if (path === '/drivers') return 'Drivers'
        if (path.startsWith('/drivers/')) return 'Driver Details'
        if (path === '/vehicles') return 'Vehicles'
        if (path.startsWith('/vehicles/')) return 'Vehicle Details'
        if (path === '/fare-configs') return 'Fare Configurations'
        if (path === '/operators') return 'Operators'
        if (path === '/permissions') return 'Role Permissions'
        if (path === '/admins') return 'Admin Management'
        if (path === '/settings') return 'Account Settings'
        return 'Panel'
    }

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
        }

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showNotifications])

    const handleMarkAllRead = () => {
        if (onMarkAllRead) {
            onMarkAllRead()
        }
    }

    const handleClear = () => {
        if (onClearNotifications) {
            onClearNotifications()
        }
    }

    return (
        <div className="top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button
                    className="icon-btn toggle-btn"
                    onClick={onToggleSidebar}
                    title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className="material-icons">
                        {isSidebarCollapsed ? 'menu_open' : 'menu'}
                    </span>
                </button>
                <h1 className="page-title-text">{getPageName()}</h1>
            </div>

            <div className="top-bar-right">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `top-bar-link ${isActive ? 'active' : ''}`}
                    title="Settings"
                >
                    <span className="material-icons">settings</span>

                </NavLink>

                {/* Notification Center */}
                <div className="notification-center" ref={notificationRef}>
                    <button
                        className="icon-btn notification-btn"
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        <span className="material-icons">notifications</span>
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-header">
                                <h3>Notifications</h3>
                                {unreadCount > 0 && (
                                    <button className="link-btn" onClick={handleMarkAllRead}>
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div className="notification-list">
                                {notifications.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="material-icons">notifications_off</span>
                                        <p>No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`notification-item ${!notif.read ? 'unread' : ''}`}
                                        >
                                            <div className="notification-icon">
                                                {notif.type === 'admin' && <span className="material-icons">admin_panel_settings</span>}
                                                {notif.type === 'driver' && <span className="material-icons">person</span>}
                                                {notif.type === 'vehicle' && <span className="material-icons">directions_car</span>}
                                                {notif.type === 'system' && <span className="material-icons">info</span>}
                                                {!['admin', 'driver', 'vehicle', 'system'].includes(notif.type) && (
                                                    <span className="material-icons">notifications</span>
                                                )}
                                            </div>
                                            <div className="notification-content">
                                                <h4>{notif.title}</h4>
                                                <p>{notif.message}</p>
                                                <span className="notification-time">{notif.timeLabel}</span>
                                            </div>
                                            {!notif.read && <div className="unread-indicator"></div>}
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="notification-footer">
                                    <button className="link-btn" onClick={handleClear}>
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="user-profile-top">
                    <div>
                        <span>{adminName}</span>
                        <p>{admin?.role}</p>
                    </div>
                    <div className="avatar-initials">{adminInitial}</div>
                </div>
                <button
                    className="icon-btn"
                    onClick={onSignOut}
                    title="Sign out"
                >
                    <span className="material-icons">logout</span>
                </button>
            </div>
        </div>
    )
}

export default TopBar
