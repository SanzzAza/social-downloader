/**
 * TEMPORARY diagnostic: probes YouTube extraction paths from the deployment
 * itself, to tell an IP-level block apart from a code bug.
 * Delete once the YouTube situation is settled.
 */

const CLIENTS = {
  ANDROID_VR: {
    ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12)',
    client: { clientName: 'ANDROID_VR', clientVersion: '1.60.19', androidSdkVersion: 32, deviceModel: 'Quest 3', hl: 'en' }
  },
  IOS: {
    ua: 'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X)',
    client: { clientName: 'IOS', clientVersion: '20.03.02', deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.2.1.22C161', hl: 'en' }
  },
  ANDROID: {
    ua: 'com.google.android.youtube/19.09.37 (Linux; U; Android 14)',
    client: { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 34, hl: 'en' }
  },
  WEB: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
    client: { clientName: 'WEB', clientVersion: '2.20240726.00.00', hl: 'en' }
  }
};

export default async function handler(req, res) {
  const videoId = (req.query.v || 'jNQXAC9IVRw').toString().slice(0, 20);
  const out = { videoId, innertube: {}, scrape: {} };

  for (const [name, profile] of Object.entries(CLIENTS)) {
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': profile.ua },
        body: JSON.stringify({ videoId, context: { client: profile.client }, contentCheckOk: true, racyCheckOk: true })
      });
      const j = await r.json();
      const f = [...(j.streamingData?.adaptiveFormats || []), ...(j.streamingData?.formats || [])];
      out.innertube[name] = {
        http: r.status,
        status: j.playabilityStatus?.status || null,
        reason: (j.playabilityStatus?.reason || '').slice(0, 80) || null,
        formats: f.length,
        withUrl: f.filter(x => x.url).length
      };
    } catch (e) {
      out.innertube[name] = { error: e.message.slice(0, 80) };
    }
  }

  // Plain HTML scrape: does the watch page even expose a player response?
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await r.text();
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    let parsed = null;
    if (m) {
      try {
        const j = JSON.parse(m[1]);
        const f = [...(j.streamingData?.adaptiveFormats || []), ...(j.streamingData?.formats || [])];
        parsed = {
          status: j.playabilityStatus?.status || null,
          formats: f.length,
          withUrl: f.filter(x => x.url).length,
          ciphered: f.filter(x => !x.url && x.signatureCipher).length
        };
      } catch (_) { parsed = 'parse failed'; }
    }
    out.scrape = {
      http: r.status,
      bytes: html.length,
      consentWall: /consent\.youtube|Before you continue/i.test(html),
      botCheck: /unusual traffic|not a robot|sign in to confirm/i.test(html),
      playerResponse: parsed
    };
  } catch (e) {
    out.scrape = { error: e.message.slice(0, 80) };
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}
