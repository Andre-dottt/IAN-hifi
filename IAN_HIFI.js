/*
 * IAN HI-FI 1.0.0 — starter module for 8SPINE
 * Based on the interface visible in the user-provided TIDAL 1.6.0 module.
 *
 * IMPORTANT:
 * - TIDAL requests below use the third-party endpoint shown in the supplied code.
 *   Its availability/authorization is not guaranteed by this project.
 * - Apple Music catalog search requires the user's own Apple Music developer token.
 * - Apple Music playback is intentionally not faked: MusicKit playback is not a
 *   plain public audio URL and needs an authorized MusicKit integration.
 */

var IAN_TIDAL_BASE = 'https://tidomeowspine.rickyaddons.dpdns.org';
var IAN_TIDAL_TOKEN = 'spineapp';
var IAN_APPLE_DEVELOPER_TOKEN = ''; // Add your own authorized Apple Music developer token.

function ianFetchJson(url, options) {
  var opts = options || {};
  opts.headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
  try {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(15000);
    }
  } catch (e) {}
  return fetch(url, opts).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function ianTidalFetch(path, params) {
  var query = new URLSearchParams(params || {}).toString();
  return ianFetchJson(IAN_TIDAL_BASE + '/' + IAN_TIDAL_TOKEN + path + (query ? '?' + query : ''));
}

function ianAppleSearch(query, limit) {
  if (!IAN_APPLE_DEVELOPER_TOKEN) return Promise.resolve([]);
  var url = 'https://api.music.apple.com/v1/catalog/us/search?term=' +
    encodeURIComponent(query) + '&types=songs&limit=' + (limit || 20);
  return ianFetchJson(url, {
    headers: { 'Authorization': 'Bearer ' + IAN_APPLE_DEVELOPER_TOKEN }
  }).then(function (data) {
    var songs = data && data.results && data.results.songs && data.results.songs.data || [];
    return songs.map(function (s) {
      var a = s.attributes || {};
      return {
        id: 'apple__' + s.id,
        title: a.name || 'Unknown',
        artist: a.artistName || 'Unknown',
        album: a.albumName || '',
        duration: a.durationInMillis ? Math.round(a.durationInMillis / 1000) : 0,
        albumCover: (a.artwork && a.artwork.url || '').replace('{w}', '600').replace('{h}', '600'),
        format: 'apple_music',
        audioQuality: 'Apple Music playback via MusicKit',
        source: 'Apple Music'
      };
    });
  });
}

function ianTidalSearch(query, limit) {
  return ianTidalFetch('/search', { q: query, limit: limit || 20 }).then(function (data) {
    return (data.tracks || []).map(function (t) {
      return {
        id: 'tidal__' + t.id,
        title: t.title || 'Unknown',
        artist: t.artist || 'Unknown',
        album: t.album || '',
        duration: t.duration || 0,
        albumCover: t.artworkURL || '',
        format: 'flac',
        isrc: t.isrc || undefined,
        isHiRes: !!t.isHiRes,
        audioQuality: t.isHiRes ? 'Hi-Res FLAC (backend metadata)' : 'Lossless FLAC (backend metadata)',
        source: 'TIDAL'
      };
    });
  });
}

async function ianSearchTracks(query, limit) {
  var results = await Promise.allSettled([
    ianTidalSearch(query, limit),
    ianAppleSearch(query, limit)
  ]);
  var tidal = results[0].status === 'fulfilled' ? results[0].value : [];
  var apple = results[1].status === 'fulfilled' ? results[1].value : [];
  var tracks = tidal.concat(apple);
  return { tracks: tracks, total: tracks.length };
}

function ianStream(trackId, quality) {
  var id = String(trackId || '');
  if (id.indexOf('tidal__') === 0) {
    var tidalId = id.slice('tidal__'.length);
    var q = String(quality || 'LOSSLESS').toUpperCase();
    if (q !== 'LOSSLESS' && q !== 'HIGH' && q !== 'LOW') q = 'LOSSLESS';
    return ianTidalFetch('/stream/' + encodeURIComponent(tidalId), {
      videosEnabled: 'false',
      quality: q,
      atmos: '0',
      detailedQuality: 'true'
    }).then(function (data) {
      var url = data.url || data.streamUrl || null;
      var format = String(data.format || 'flac').toLowerCase();
      var label = data.quality || (format === 'flac' ? 'FLAC Lossless' : format.toUpperCase());
      var isHls = /\.m3u8(\?|$)/i.test(url || '');
      return {
        streamUrl: url,
        downloadUrl: null,
        mimeType: isHls ? 'application/vnd.apple.mpegurl' : (format === 'flac' ? 'audio/flac' : 'audio/mp4'),
        streamType: isHls ? 'hls' : 'direct',
        track: { id: id, audioQuality: label, quality: label, format: format,
          bitrate: (String(label).match(/(\d+)\s*kbps/i) || [])[1] ?
            Number((String(label).match(/(\d+)\s*kbps/i) || [])[1]) : undefined }
      };
    });
  }
  // Apple Music playback requires MusicKit authorization/session in a supported
  // host. Returning a fabricated URL here would be misleading and unreliable.
  return Promise.resolve({ streamUrl: null, track: { id: id, audioQuality: 'Requires Apple Music MusicKit playback' } });
}

async function ianGetAlbum(albumId) {
  var id = String(albumId || '');
  if (id.indexOf('tidal__') === 0) {
    var data = await ianTidalFetch('/album/' + encodeURIComponent(id.slice(7)), {});
    return { album: { id: id, title: data.title || 'Unknown', artist: data.artist || 'Unknown',
      cover: data.artworkURL || '', year: data.year || '' },
      tracks: (data.tracks || []).map(function (t) {
        return { id: 'tidal__' + t.id, title: t.title || 'Unknown', artist: t.artist || data.artist || 'Unknown',
          album: data.title || '', duration: t.duration || 0, albumCover: t.artworkURL || data.artworkURL || '',
          format: 'flac', isHiRes: !!t.isHiRes, audioQuality: t.isHiRes ? 'Hi-Res FLAC' : 'Lossless FLAC' };
      }) };
  }
  return { album: null, tracks: [] };
}

return {
  id: 'ian-hifi',
  name: 'IAN HI-FI',
  version: '1.0.0',
  labels: ['TIDAL', 'APPLE MUSIC', 'LOSSLESS', 'HI-RES', 'MULTI-SOURCE'],
  noStreamCache: true,
  settings: {
    quality: {
      type: 'selector',
      label: 'Audio Quality',
      description: 'Requested TIDAL quality. Actual delivered quality depends on source availability.',
      options: [
        { label: 'Lossless (FLAC)', value: 'LOSSLESS' },
        { label: 'High (AAC)', value: 'HIGH' },
        { label: 'Low (AAC)', value: 'LOW' }
      ],
      defaultValue: 'LOSSLESS'
    }
  },
  searchTracks: ianSearchTracks,
  getTrackStreamUrl: ianStream,
  getTrackDownloadUrl: ianStream,
  getAlbum: ianGetAlbum
};
