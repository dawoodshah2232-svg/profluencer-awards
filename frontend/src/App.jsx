import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout, { ToastProvider } from './components/Layout'
import { getMode, initStore, subscribeMode } from './lib/store'
import { isApiReachable, subscribeApiReachable } from './lib/api'

import Home from './pages/Home'
import Categories from './pages/Categories'
import Nominees from './pages/Nominees'
import NomineeDetail from './pages/NomineeDetail'
import Nominate from './pages/Nominate'
import Winners from './pages/Winners'
import Event from './pages/Event'
import Sponsors from './pages/Sponsors'
import Contact from './pages/Contact'
import Voting from './pages/Voting'
import News from './pages/News'
import NewsArticle from './pages/NewsArticle'
import About from './pages/About'
import Faq from './pages/Faq'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Login from './pages/Login'
import Admin from './pages/Admin'
import InfluencerDashboard from './pages/InfluencerDashboard'
import NotFound from './pages/NotFound'

/* Legacy vote.html?id= links redirect to the nominee detail route. */
function VoteRedirect() {
  const { id } = useParams()
  return <Navigate to={`/nominee/${id}`} replace />
}

function Shell() {
  const [mode, setMode] = useState(getMode())
  const [offline, setOffline] = useState(() => !isApiReachable())

  useEffect(() => {
    initStore()
    const off1 = subscribeMode(setMode)
    const off2 = subscribeApiReachable((ok) => setOffline(!ok))
    return () => { off1(); off2() }
  }, [])

  return (
    <Layout demoMode={mode === 'demo'} offline={offline}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/nominees" element={<Nominees />} />
        <Route path="/nominee/:id" element={<NomineeDetail />} />
        <Route path="/vote/:id" element={<VoteRedirect />} />
        <Route path="/nominate" element={<Nominate />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/event" element={<Event />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/voting" element={<Voting />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsArticle />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/dashboard" element={<InfluencerDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </HashRouter>
  )
}
