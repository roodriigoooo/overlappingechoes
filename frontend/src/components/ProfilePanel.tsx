import React from 'react'
import type { User, Profile } from '../types'

interface Props {
  user: User | null
  profile: Profile | null
  refreshing: boolean
  onRefresh: () => void
}

export default function ProfilePanel({ user, profile, refreshing, onRefresh }: Props) {
  if (!user) {
    return (
      <>
        <div className="panel-header">
          <span className="panel-title">Profile</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading…</div>
        </div>
      </>
    )
  }

  const lyricStatus = profile?.lyricStatus ?? 'none'
  const lastUpdated = profile?.lastUpdated
    ? timeAgo(profile.lastUpdated)
    : null

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Profile</span>
      </div>
      <div className="panel-body">
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="profile-avatar">
            {initials(user.displayName)}
          </div>
          <div>
            <div className="profile-name">{user.displayName}</div>
            <div className="profile-id">{user.spotifyId}</div>
          </div>
        </div>

        {/* Lyric status */}
        <div>
          <div className="status-row">
            <div className={`status-dot ${lyricStatus}`} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {lyricStatus === 'ready' && `Lyric profile ready`}
              {lyricStatus === 'pending' && 'Building lyric profile…'}
              {lyricStatus === 'failed' && 'Lyric profile failed'}
              {lyricStatus === 'none' && 'No profile yet'}
            </span>
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              Updated {lastUpdated}
            </div>
          )}
          {profile?.lyricTracksAnalyzed != null && lyricStatus === 'ready' && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {profile.lyricTracksAnalyzed} tracks analyzed
            </div>
          )}
        </div>

        {/* Top genres */}
        {profile?.topGenres && profile.topGenres.length > 0 && (
          <div>
            <div className="section-label">Top Genres</div>
            <div className="genre-chips">
              {profile.topGenres.map(g => (
                <span key={g} className="chip">{g}</span>
              ))}
            </div>
          </div>
        )}

        {/* Top artists */}
        {profile?.topArtistsPreview && profile.topArtistsPreview.length > 0 && (
          <div>
            <div className="section-label">Top Artists</div>
            <div className="artist-list">
              {profile.topArtistsPreview.map((a, i) => (
                <div key={a.id} className="artist-item">
                  <span className="artist-num">{i + 1}</span>
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh */}
        <button
          className="btn btn-primary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing
            ? <><span className="spin">↻</span> Refreshing…</>
            : 'Refresh Profile'
          }
        </button>

        {!profile?.hasProfile && !refreshing && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Refresh to build your music taste profile.
          </p>
        )}
      </div>
    </>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function timeAgo(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
