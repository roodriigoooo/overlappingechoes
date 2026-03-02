import React, { useState, useEffect, useRef } from 'react'
import * as api from './api'
import type { User, Profile, GraphData, Friend, FriendRequests } from './types'
import Graph from './components/Graph'
import ProfilePanel from './components/ProfilePanel'
import FriendsPanel from './components/FriendsPanel'
import LoadingScreen from './components/LoadingScreen'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('spotify_token'))
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] })
  const [mode, setMode] = useState<'taste' | 'lyric'>('taste')
  const [refreshing, setRefreshing] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle OAuth callback — token arrives as query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      localStorage.setItem('spotify_token', t)
      setToken(t)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Load all data once on auth
  useEffect(() => {
    if (!token) return
    api.getMe().then(setUser).catch(() => { })
    api.getProfile().then(setProfile).catch(() => { })
    api.getGraph('taste').then(setGraphData).catch(() => { })
    api.getFriends().then(setFriends).catch(() => { })
    api.getFriendRequests().then(setFriendRequests).catch(() => { })
  }, [token])

  // Reload graph when mode changes
  useEffect(() => {
    if (!token) return
    api.getGraph(mode).then(setGraphData).catch(() => { })
  }, [mode, token])

  // Poll profile while lyric computation is pending
  useEffect(() => {
    if (profile?.lyricStatus !== 'pending') return
    pollRef.current = setTimeout(() => {
      api.getProfile().then(p => {
        setProfile(p)
        if (p.lyricStatus === 'ready') {
          api.getGraph(mode).then(setGraphData).catch(() => { })
        }
      }).catch(() => { })
    }, 5000)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [profile?.lyricStatus, mode])

  const handleLogin = async () => {
    setAuthLoading(true)
    try {
      const url = await api.getAuthUrl()
      window.location.href = url
    } catch {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('spotify_token')
    setToken(null)
    setUser(null)
    setProfile(null)
    setGraphData(null)
    setFriends([])
    setFriendRequests({ incoming: [], outgoing: [] })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const p = await api.refreshProfile()
      setProfile(p)
      api.getGraph(mode).then(setGraphData).catch(() => { })
    } catch { }
    setRefreshing(false)
  }

  const handleFriendUpdate = () => {
    api.getFriends().then(setFriends).catch(() => { })
    api.getFriendRequests().then(setFriendRequests).catch(() => { })
    api.getGraph(mode).then(setGraphData).catch(() => { })
  }

  if (!token) {
    return (
      <div className="landing">
        <div className="landing-content">
          <div className="landing-logo">
            <LogoSvg />
          </div>
          <h1>Spotify Graph</h1>
          <p>Discover how your music taste connects you with friends.</p>
          <button className="btn-spotify" onClick={handleLogin} disabled={authLoading}>
            <SpotifyIcon />
            {authLoading ? 'Redirecting…' : 'Continue with Spotify'}
          </button>
        </div>
      </div>
    )
  }

  if (token && (!user || !graphData)) {
    return <LoadingScreen text="Loading taste graph..." />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-logo"><LogoSvg /></div>
          <span className="header-title">Spotify Graph</span>
        </div>

        <div className="mode-toggle">
          <button
            className={`mode-btn${mode === 'taste' ? ' active' : ''}`}
            onClick={() => setMode('taste')}
          >
            Taste
          </button>
          <button
            className={`mode-btn${mode === 'lyric' ? ' active' : ''}`}
            onClick={() => setMode('lyric')}
          >
            Lyric
          </button>
        </div>

        <div className="header-right">
          {user && <span className="header-user">{user.displayName}</span>}
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="canvas">
        {token && mode === 'lyric' && profile?.lyricStatus === 'pending' && (
          <LoadingScreen text="Computing Lyrics..." />
        )}
        <Graph data={graphData} mode={mode} />

        {/* Left panel toggle */}
        <button
          className={`panel-toggle panel-toggle-left${leftOpen ? ' open' : ''}`}
          onClick={() => setLeftOpen(o => !o)}
          aria-label="Toggle profile panel"
        >
          {leftOpen ? '‹' : '›'}
        </button>

        <div className={`panel panel-left${leftOpen ? '' : ' collapsed-left'}`}>
          <ProfilePanel
            user={user}
            profile={profile}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Right panel toggle */}
        <button
          className={`panel-toggle panel-toggle-right${rightOpen ? ' open' : ''}`}
          onClick={() => setRightOpen(o => !o)}
          aria-label="Toggle friends panel"
        >
          {rightOpen ? '›' : '‹'}
        </button>

        <div className={`panel panel-right${rightOpen ? '' : ' collapsed-right'}`}>
          <FriendsPanel
            friends={friends}
            requests={friendRequests}
            onUpdate={handleFriendUpdate}
          />
        </div>
      </div>
    </div>
  )
}

function LogoSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="4" r="2.5" fill="currentColor" />
      <circle cx="4" cy="18" r="2.5" fill="currentColor" />
      <circle cx="20" cy="18" r="2.5" fill="currentColor" />
      <path d="M12 6.5L4.5 16M12 6.5L19.5 16M5.5 18H18.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
