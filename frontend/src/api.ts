const API = 'https://9q14rl4vc1.execute-api.us-east-1.amazonaws.com/prod'

function token() {
  return localStorage.getItem('spotify_token')
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token()
  const res = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { 'X-Auth-Token': t } : {}),
      ...(init.headers as Record<string, string> || {}),
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export async function getAuthUrl(): Promise<string> {
  const data = await req<{ authUrl: string }>('/auth/spotify')
  return data.authUrl
}

export const getMe = () => req<any>('/me')
export const getProfile = () => req<any>('/me/profile')
export const refreshProfile = () => req<any>('/me/profile/refresh', { method: 'POST' })
export const getGraph = (mode: string) => req<any>(`/graph?mode=${mode}`)
export const getFriends = () => req<any[]>('/friends')
export const getFriendRequests = () => req<any>('/friends/requests')

export const sendFriendRequest = (toSpotifyId: string) =>
  req<any>('/friends/request', { method: 'POST', body: JSON.stringify({ toSpotifyId }) })

export const acceptFriendRequest = (requestId: string) =>
  req<any>('/friends/accept', { method: 'POST', body: JSON.stringify({ requestId }) })

export const deleteFriend = (friendId: string) =>
  req<any>(`/friends/${friendId}`, { method: 'DELETE' })
