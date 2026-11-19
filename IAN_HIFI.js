/*
 * IAN HI-FI 1.1.0 — cautious 8SPINE test build.
 * TIDAL depends on the third-party endpoint from the supplied reference module.
 * Apple Music is catalog-search only; MusicKit playback is not implemented.
 * Downloads are disabled; temporary playback URLs are not download links.
 */
var IAN_TIDAL_BASE = 'https://tidomeowspine.rickyaddons.dpdns.org';
var IAN_TIDAL_PREFIX = '/spineapp';
var IAN_TIDAL_TOKEN = 'spineapp'; // Public endpoint value from supplied reference; not a private credential.
var IAN_APPLE_DEVELOPER_TOKEN = ''; // Optional authorized Apple Music developer token.

function ianFetchJson(url, options) {
  var opts = options || {};
  opts.headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
  try {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(15000);
  } catch (e) {}
  return fetch(url, opts).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}
function ianTidalFetch(path, params) {
  var q = new URLSearchParams(params || {}).toString();
  var url = IAN_TIDAL_BASE + IAN_TIDAL_PREFIX + path + (q ? '?' + q : '');
  return ianFetchJson(url, { headers: { Authorization: 'Bearer ' + IAN_TIDAL_TOKEN } });
}
function ianTidalSearch(query, limit) {
  return ianTidalFetch('/search', { q: query, limit: limit || 20 }).then(function (data) {
    var list = data && Array.isArray(data.tracks) ? data.tracks : [];
    return list.filter(function (t) { return t && t.id != null; }).map(function (t) {
      return {
        id: 'tidal__' + String(t.id), title: t.title || 'Unknown',
        artist: t.artist || t.artistName || 'Unknown', album: t.album || t.albumTitle || '',
        duration: Number(t.duration || 0), albumCover: t.artworkURL || t.cover || '',
        format: 'flac', isrc: t.isrc || undefined, isHiRes: !!t.isHiRes,
        audioQuality: t.isHiRes ? 'Hi-Res (reported by source)' : 'Lossless (reported by source)',
        source: 'TIDAL'
      };
    });
  });
}
function ianAppleSearch(query, limit) {
  if (!IAN_APPLE_DEVELOPER_TOKEN) return Promise.resolve([]);
  var url = 'https://api.music.apple.com/v1/catalog/us/search?term=' +
    encodeURIComponent(query) + '&types=songs&limit=' + (limit || 20);
  return ianFetchJson(url, { headers: { Authorization: 'Bearer ' + IAN_APPLE_DEVELOPER_TOKEN } })
    .then(function (data) {
      var songs = data && data.results && data.results.songs && data.results.songs.data || [];
      return songs.map(function (s) {
        var a = s.attributes || {};
        return {
          id: 'apple__' + s.id, title: a.name || 'Unknown', artist: a.artistName || 'Unknown',
          album: a.albumName || '', duration: a.durationInMillis ? Math.round(a.durationInMillis / 1000) : 0,
          albumCover: (a.artwork && a.artwork.url || '').replace('{w}', '600').replace('{h}', '600'),
          format: 'apple_music_catalog', audioQuality: 'Playback requires MusicKit', source: 'Apple Music'
        };
      });
    });
}
async function ianSearchTracks(query, limit) {
  var r = await Promise.allSettled([ianTidalSearch(query, limit), ianAppleSearch(query, limit)]);
  var tidal = r[0].status === 'fulfilled' ? r[0].value : [];
  var apple = r[1].status === 'fulfilled' ? r[1].value : [];
  return { tracks: tidal.concat(apple), total: tidal.length + apple.length };
}
function ianGetTrackStreamUrl(trackId, quality) {
  var id = String(trackId || '');
  if (id.indexOf('tidal__') !== 0) {
    return Promise.resolve({ streamUrl: null, track: { id: id, audioQuality: 'Apple Music playback requires MusicKit' } });
  }
  var q = String(quality || 'HI_RES').toUpperCase();
  var allowed = ['HI_RES', 'HI_RES_DOLBY', 'CD', 'HIGH', 'LOW'];
  if (allowed.indexOf(q) < 0) q = 'HI_RES';
  return ianTidalFetch('/stream/' + encodeURIComponent(id.slice(7)), {
    quality: q, atmos: q === 'HI_RES_DOLBY' ? '1' : '0', detailedQuality: 'true'
  }).then(function (data) {
    var url = data && (data.url || data.streamUrl) || null;
    var fmt = String(data && data.format || 'unknown').toLowerCase();
    var label = data && (data.quality || data.audioQuality) || 'Quality not confirmed by server';
    var hls = /\.m3u8(\?|$)/i.test(url || '');
    return {
      streamUrl: url, downloadUrl: null,
      mimeType: hls ? 'application/vnd.apple.mpegurl' : (fmt === 'flac' ? 'audio/flac' : 'application/octet-stream'),
      streamType: hls ? 'hls' : 'direct',
      track: { id: id, audioQuality: label, quality: label, format: fmt }
    };
  });
}
function ianGetTrackDownloadUrl() { return Promise.resolve(null); }
async function ianGetAlbum(albumId) {
  var id = String(albumId || '');
  if (id.indexOf('tidal__') !== 0) return { album: null, tracks: [] };
  var data = await ianTidalFetch('/album/' + encodeURIComponent(id.slice(7)), {});
  var list = Array.isArray(data && data.tracks) ? data.tracks : [];
  return {
    album: { id: id, title: data.title || 'Unknown', artist: data.artist || 'Unknown',
      cover: data.artworkURL || '', year: data.year || '' },
    tracks: list.filter(function (t) { return t && t.id != null; }).map(function (t) {
      return { id: 'tidal__' + String(t.id), title: t.title || 'Unknown',
        artist: t.artist || data.artist || 'Unknown', album: data.title || '',
        duration: Number(t.duration || 0), albumCover: t.artworkURL || data.artworkURL || '',
        format: 'flac', isHiRes: !!t.isHiRes,
        audioQuality: t.isHiRes ? 'Hi-Res (reported by source)' : 'Lossless (reported by source)' };
    })
  };
}
return {
  id: 'ian-hifi', name: 'IAN HI-FI', version: '1.1.0',
  labels: ['TIDAL', 'APPLE MUSIC CATALOG', 'LOSSLESS', 'HI-RES', 'MULTI-SOURCE'],
  noStreamCache: true,
  settings: {
    quality: {
      type: 'selector', label: 'Audio Quality',
      description: 'Requested TIDAL quality; actual delivery depends on the track, account, server and player.',
      options: [
        { label: 'Hi-Res', value: 'HI_RES' },
        { label: 'Hi-Res Dolby Atmos', value: 'HI_RES_DOLBY' },
        { label: 'CD Lossless', value: 'CD' },
        { label: 'High', value: 'HIGH' },
        { label: 'Low', value: 'LOW' }
      ],
      defaultValue: 'HI_RES'
    }
  },
  searchTracks: ianSearchTracks,
  getTrackStreamUrl: ianGetTrackStreamUrl,
  getTrackDownloadUrl: ianGetTrackDownloadUrl,
  getAlbum: ianGetAlbum
};
