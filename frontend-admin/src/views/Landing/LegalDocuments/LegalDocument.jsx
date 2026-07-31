import { Link } from 'react-router-dom'
import './LegalDocument.css'

const LegalDocument = ({ document }) => (
    <div className="policy-page">
        <header className="policy-hero">
            <div className="policy-hero-copy">
                <p className="policy-audience">{document.audience}</p>
                <h1>{document.title}</h1>
                <p className="policy-summary">{document.summary}</p>
                <div className="policy-meta">
                    <span className="policy-status">{document.status}</span>
                    <span>Last updated {document.updated}</span>
                </div>
            </div>
            <nav className="policy-switcher" aria-label="Passenger legal documents">
                {document.links.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={link.to === document.path ? 'active' : ''}
                        aria-current={link.to === document.path ? 'page' : undefined}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </header>

        {document.notice && (
            <aside className="policy-notice" role="note">
                <strong>{document.notice.title}</strong>
                <p>{document.notice.text}</p>
            </aside>
        )}

        <div className="policy-layout">
            <aside className="policy-toc" aria-label="On this page">
                <p>On this page</p>
                {document.sections.map((section, index) => (
                    <a key={section.title} href={`#policy-${index + 1}`}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {section.title}
                    </a>
                ))}
            </aside>

            <main className="policy-content">
                {document.sections.map((section, index) => (
                    <section id={`policy-${index + 1}`} key={section.title}>
                        <div className="policy-heading">
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <h2>{section.title}</h2>
                        </div>
                        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                        {section.items && (
                            <ul>
                                {section.items.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                        )}
                        {section.note && <p className="policy-inline-note">{section.note}</p>}
                    </section>
                ))}
            </main>
        </div>
    </div>
)

export default LegalDocument
