import { useEffect, useRef, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { resolveAssetUrl } from '../services/adminApi'
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
    const location = useLocation()
    const adminName = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : 'Admin User'
    const adminInitial = admin?.first_name?.charAt(0) || 'A'
    const [isNotificationsOpen, setNotificationsOpen] = useState(false)
    const notificationRef = useRef(null)

    const getPageName = () => {
        const path = location.pathname
        if (path === '/') return 'Dashboard'
        if (path === '/customers') return 'Passengers'
        if (path === '/drivers') return 'Drivers'
        if (path.startsWith('/drivers/')) return 'Driver Details'
        if (path === '/vehicles') return 'Vehicles'
        if (path.startsWith('/vehicles/')) return 'Vehicle Details'
        if (path === '/admins') return 'Admin Management'
        if (path === '/settings') return 'Account Settings'
        return 'Panel'
    }

    const toggleNotifications = () => {
        setNotificationsOpen((prev) => {
            const next = !prev
            if (next && onMarkAllRead) {
                onMarkAllRead()
            }
            return next
        })
    }

    useEffect(() => {
        if (!isNotificationsOpen) return

        const handleClickOutside = (event) => {
            if (!notificationRef.current) return
            if (!notificationRef.current.contains(event.target)) {
                setNotificationsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isNotificationsOpen])

    return (
        <header className="top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                    className="icon-btn toggle-btn"
                    onClick={onToggleSidebar}
                >
                    <span className="material-icons">
                        {isSidebarCollapsed ? 'menu_open' : 'menu'}
                    </span>
                </button>

                <div className="page-title-display">
                    <h2 className="page-title-text">
                        {getPageName()}
                    </h2>
                </div>
            </div>

            <div className="top-bar-right">
                <div className="notification-shell" ref={notificationRef}>
                    <button
                        className="icon-btn notification-btn"
                        onClick={toggleNotifications}
                        aria-haspopup="true"
                        aria-expanded={isNotificationsOpen}
                    >
                        <span className="material-icons">
                            {unreadCount > 0 ? 'notifications' : 'notifications_none'}
                        </span>
                        {unreadCount > 0 && (
                            <span className="notification-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="notification-panel">
                            <div className="notification-header">
                                <div>
                                    <p className="notification-title">Notifications</p>
                                    <span className="notification-subtitle">
                                        {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
                                    </span>
                                </div>
                                <button
                                    className="notification-clear"
                                    onClick={onClearNotifications}
                                    disabled={notifications.length === 0}
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="notification-list">
                                {notifications.length === 0 ? (
                                    <div className="notification-empty">
                                        No notifications yet.
                                    </div>
                                ) : (
                                    notifications.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`notification-item ${item.type} ${item.read ? 'read' : 'unread'}`}
                                        >
                                            <span className={`notification-dot ${item.type}`} />
                                            <div className="notification-body">
                                                <div className="notification-row">
                                                    <span className="notification-item-title">{item.title}</span>
                                                    <span className="notification-time">{item.timeLabel}</span>
                                                </div>
                                                <p className="notification-message">{item.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <Link to="/settings" className="icon-btn">
                    <span className="material-icons">settings</span>
                </Link>

                <div className="user-profile-top">
                    <div>
                        <span>{adminName}</span>
                        <p>Administrator</p>
                    </div>
                    <div className="avatar-initials avatar-green">
                        {admin?.profile_picture_path ? (
                            <img src={resolveAssetUrl(admin.profile_picture_path)} alt={adminName} />
                        ) : (
                            adminInitial
                        )}
                    </div>
                </div>

                <button className="icon-btn" onClick={onSignOut} title="Sign Out">
                    <span className="material-icons">logout</span>
                </button>
            </div>
        </header>
    )
}

export default TopBar
