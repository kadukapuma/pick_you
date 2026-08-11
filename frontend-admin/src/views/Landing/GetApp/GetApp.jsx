import { useEffect, useState } from 'react'
import { FaCar, FaDownload, FaUser } from 'react-icons/fa'
import { API_BASE } from '../../../services/adminApi'
import './GetApp.css'

const formatSize = bytes => `${(Number(bytes) / 1048576).toFixed(1)} MB`

export default function GetApp() {
  const [downloads, setDownloads] = useState({ passenger: null, driver: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/app-downloads`, { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load downloads.')))
      .then(payload => setDownloads(payload.data || {}))
      .catch(() => setDownloads({ passenger: null, driver: null }))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    ['passenger', FaUser, 'PickU Passenger', 'Book rides and travel with PickU.'],
    ['driver', FaCar, 'PickU Driver', 'Accept trips and manage your driving.'],
  ]

  return <main className="get-app-page">
    <section className="get-app-hero">
      <span>OFFICIAL ANDROID DOWNLOADS</span>
      <h1>Get the PickU App</h1>
      <p>Choose the app you need. APK files are uploaded and maintained by PickU administrators.</p>
    </section>
    <section className="get-app-grid">
      {cards.map(([app, Icon, title, description]) => {
        const release = downloads[app]
        return <article className="get-app-card" key={app}>
          <div className={`get-app-icon ${app}`}><Icon /></div>
          <h2>{title}</h2>
          <p>{description}</p>
          {release ? <>
            <div className="release-meta"><span>Version {release.version}</span><span>{formatSize(release.size)}</span></div>
            <a className="apk-download-button" href={release.download_url}>
              <FaDownload /> Download APK
            </a>
            <small>Updated {new Date(release.uploaded_at).toLocaleDateString()}</small>
          </> : <button className="apk-download-button unavailable" disabled>{loading ? 'Checking...' : 'Coming soon'}</button>}
        </article>
      })}
    </section>
    <p className="install-help">Android may ask permission to install apps from your browser. Only install APKs downloaded from this official page.</p>
  </main>
}
