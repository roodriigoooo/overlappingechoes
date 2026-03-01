"""
GET /graph?mode=taste|lyric  (default: taste)
Returns nodes and edges for the similarity graph.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from common.dynamodb_utils import query_items, batch_get_items
from common.similarity import taste_similarity, lyric_similarity
from common.response_utils import success_response, error_response
from common.logger import log_info, log_error
from boto3.dynamodb.conditions import Key


USERS_TABLE = os.environ.get('USERS_TABLE')
FRIENDS_TABLE = os.environ.get('FRIENDS_TABLE')
MUSIC_PROFILES_TABLE = os.environ.get('MUSIC_PROFILES_TABLE')


def _coerce_vectors(profile: dict) -> dict:
    """Coerce Decimal values in lyricVector and genreVector to float."""
    if 'lyricVector' in profile:
        profile['lyricVector'] = [float(v) for v in profile['lyricVector']]
    if 'genreVector' in profile:
        profile['genreVector'] = {k: float(v) for k, v in profile['genreVector'].items()}
    if 'topArtists' in profile:
        for range_name, artists in profile['topArtists'].items():
            for artist in artists:
                if 'genres' not in artist:
                    artist['genres'] = []
    return profile


def handler(event, context):
    user_id = event.get('requestContext', {}).get('authorizer', {}).get('userId')
    if not user_id:
        return error_response(401, 'Unauthorized')

    params = event.get('queryStringParameters') or {}
    mode = params.get('mode', 'taste')
    if mode not in ('taste', 'lyric'):
        return error_response(400, "mode must be 'taste' or 'lyric'")

    try:
        # Get friend IDs
        friend_records = query_items(
            FRIENDS_TABLE,
            key_condition=Key('userId').eq(user_id)
        )
        friend_ids = [r['friendId'] for r in friend_records]

        all_user_ids = [user_id] + friend_ids

        # Batch-fetch profiles and user records
        profile_keys = [{'userId': uid} for uid in all_user_ids]
        user_keys = [{'userId': uid} for uid in all_user_ids]

        raw_profiles = batch_get_items(MUSIC_PROFILES_TABLE, profile_keys) if profile_keys else []
        raw_users = batch_get_items(USERS_TABLE, user_keys) if user_keys else []

        profiles_by_id = {p['userId']: _coerce_vectors(p) for p in raw_profiles}
        users_by_id = {u['userId']: u for u in raw_users}

        # Build nodes
        nodes = []
        for uid in all_user_ids:
            user_rec = users_by_id.get(uid, {})
            profile = profiles_by_id.get(uid)
            nodes.append({
                'userId': uid,
                'displayName': user_rec.get('displayName', ''),
                'spotifyId': user_rec.get('spotifyId', ''),
                'isCurrentUser': uid == user_id,
                'hasProfile': profile is not None,
                'lyricStatus': profile.get('lyricStatus') if profile else None
            })

        # Build edges (O(n²) over all pairs)
        edges = []
        pairs_done = set()
        for i, uid_a in enumerate(all_user_ids):
            for uid_b in all_user_ids[i + 1:]:
                pair = (min(uid_a, uid_b), max(uid_a, uid_b))
                if pair in pairs_done:
                    continue
                pairs_done.add(pair)

                profile_a = profiles_by_id.get(uid_a)
                profile_b = profiles_by_id.get(uid_b)

                if not profile_a or not profile_b:
                    continue

                if mode == 'lyric':
                    if profile_a.get('lyricStatus') != 'ready' or profile_b.get('lyricStatus') != 'ready':
                        continue
                    score = lyric_similarity(profile_a, profile_b)
                else:
                    score = taste_similarity(profile_a, profile_b)

                edges.append({
                    'source': uid_a,
                    'target': uid_b,
                    'similarity': round(score, 4)
                })

        log_info('Graph computed', user_id=user_id, mode=mode, nodes=len(nodes), edges=len(edges))

        return success_response({
            'mode': mode,
            'nodes': nodes,
            'edges': edges
        })

    except Exception as e:
        log_error('Error computing graph', user_id=user_id, error=str(e))
        return error_response(500, 'Internal server error')
