import fetch from 'node-fetch';
import cookie from 'cookie';

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT;

export default async function handler(req, res) {
  const { video, tier } = req.query;
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies['patreon_token'];

  if (!video || !tier) {
    return res.status(400).send('Missing video or tier.');
  }

  if (!token) {
    // Not logged in: redirect to Patreon OAuth
    const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identity%20identity.memberships`;
    return res.redirect(authUrl);
  }

  // Use token to fetch Patreon user and tier info
  const userResp = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Bmember%5D=currently_entitled_amount_cents', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!userResp.ok) {
    // Invalid token or expired
    res.setHeader('Set-Cookie', 'patreon_token=; Max-Age=0; Path=/; HttpOnly;');
    return res.redirect('/api/watch?video=' + video + '&tier=' + tier);
  }

  const userData = await userResp.json();
  const memberships = userData.included || [];

  const highestTier = memberships.reduce((max, m) => {
    const cents = m.attributes?.currently_entitled_amount_cents || 0;
    return Math.max(max, cents);
  }, 0);

  const requiredTierCents = parseInt(tier, 10) * 100;

  if (highestTier < requiredTierCents) {
    return res.status(403).send(`<h1>Access Denied</h1><p>You must be in the $${tier}+ tier to watch this video.</p>`);
  }

  const embedHtml = `
    <html>
      <body style="margin:0;background:#000">
        <iframe
          src="https://iframe.mediadelivery.net/embed/431977/${video}?autoplay=true&loop=false&muted=false&preload=true&responsive=true"
          style="border:0;position:absolute;top:0;left:0;height:100%;width:100%;"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(embedHtml);
}
