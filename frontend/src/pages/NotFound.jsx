import { Link } from 'react-router-dom'

const img = (p) => `${import.meta.env.BASE_URL}${p}`

export default function NotFound() {
  return (
    <main className="container">
      <div className="notfound">
        <div>
          <img src={img('img/logo-clean.png')} alt="ProFluencer Awards Dubai 2026" style={{ width: 150, maxWidth: '60%', margin: '0 auto 24px' }} />
          <h1>404</h1>
          <h2 style={{ marginTop: 8 }}>This page took a bow and left the stage</h2>
          <p>The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. Let&rsquo;s get you back to the show.</p>
          <div style={{ marginTop: 22 }}><Link className="btn btn-gold" to="/">Back to Homepage</Link></div>
          <div style={{ marginTop: 26, fontSize: 14 }}>
            <Link to="/categories" style={{ color: 'var(--gold-lt)', margin: '0 10px' }}>Categories</Link>
            <Link to="/voting" style={{ color: 'var(--gold-lt)', margin: '0 10px' }}>How Voting Works</Link>
            <Link to="/contact" style={{ color: 'var(--gold-lt)', margin: '0 10px' }}>Contact</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
