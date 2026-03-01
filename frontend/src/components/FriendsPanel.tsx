import React, { useState } from 'react'
import type { Friend, FriendRequests } from '../types'
import * as api from '../api'

interface Props {
  friends: Friend[]
  requests: FriendRequests
  onUpdate: () => void
}

export default function FriendsPanel({ friends, requests, onUpdate }: Props) {
  const [addInput, setAddInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const handleAdd = async () => {
    const id = addInput.trim()
    if (!id) return
    setAdding(true)
    setAddError('')
    try {
      await api.sendFriendRequest(id)
      setAddInput('')
      onUpdate()
    } catch (e: any) {
      setAddError(e.message || 'Failed to send request')
    }
    setAdding(false)
  }

  const handleAccept = async (requestId: string) => {
    try {
      await api.acceptFriendRequest(requestId)
      onUpdate()
    } catch {}
  }

  const handleRemove = async (friendId: string) => {
    try {
      await api.deleteFriend(friendId)
      onUpdate()
    } catch {}
  }

  const hasRequests = requests.incoming.length > 0 || requests.outgoing.length > 0

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Friends</span>
        {friends.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>
            {friends.length}
          </span>
        )}
      </div>

      <div className="panel-body">
        {/* Add friend */}
        <div>
          <div className="section-label">Add by Spotify ID</div>
          <div className="input-row">
            <input
              className="input"
              placeholder="spotify_username"
              value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAdd}
              disabled={adding || !addInput.trim()}
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>
          {addError && <div className="error-msg">{addError}</div>}
        </div>

        {/* Incoming requests */}
        {requests.incoming.length > 0 && (
          <div>
            <div className="section-label">Incoming</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requests.incoming.map(r => (
                <div key={r.requestId} className="request-item">
                  <div className="request-info">
                    <div className="request-name">
                      {r.fromDisplayName || r.fromSpotifyId}
                    </div>
                    <div className="request-sub">{r.fromSpotifyId}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAccept(r.requestId)}
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing requests */}
        {requests.outgoing.length > 0 && (
          <div>
            <div className="section-label">Sent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requests.outgoing.map(r => (
                <div key={r.requestId} className="request-item">
                  <div className="request-info">
                    <div className="request-name">
                      {r.toDisplayName || r.toSpotifyId}
                    </div>
                    <div className="request-sub" style={{ color: 'var(--text-dim)' }}>
                      Pending…
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasRequests && friends.length > 0 && <div className="divider" />}

        {/* Friends list */}
        {friends.length === 0 ? (
          <div className="empty-state">
            No friends yet.<br />
            Search by Spotify ID to connect.
          </div>
        ) : (
          <div>
            <div className="section-label">Connected</div>
            <div>
              {friends.map(f => (
                <FriendRow
                  key={f.userId}
                  friend={f}
                  onRemove={() => handleRemove(f.userId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function FriendRow({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="friend-item">
        <div className="friend-info" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Remove {friend.displayName}?
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>Yes</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>No</button>
        </div>
      </div>
    )
  }

  return (
    <div className="friend-item">
      <div className="friend-avatar">
        {(friend.displayName[0] ?? '?').toUpperCase()}
      </div>
      <div className="friend-info">
        <div className="friend-name">{friend.displayName}</div>
        <div className="friend-sub">{friend.spotifyId}</div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setConfirming(true)}
        style={{ padding: '4px 8px', color: 'var(--text-dim)' }}
        title="Remove friend"
      >
        ×
      </button>
    </div>
  )
}
