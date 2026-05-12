import './StatCard.css'

const StatCard = ({ label, value, icon, trend, trendClass }) => {
    return (
        <div className="dashboard-stat-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <div className={`trend ${trendClass || ''}`}>
                <span className="material-icons">{icon}</span>
                <span>{trend}</span>
            </div>
        </div>
    )
}

export default StatCard
