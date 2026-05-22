import { Link } from 'react-router-dom'

const NotFound = () => (
    <section className="content-grid">
        <div className="card">
            <h3>Page not found</h3>
            <p className="muted">This page does not exist yet.</p>
            <Link className="link" to="/">
                Back to dashboard
            </Link>
        </div>
    </section>
)

export default NotFound
