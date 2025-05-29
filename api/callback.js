import fetch from 'node-fetch';
import cookie from 'cookie';

const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_SECRET;
const REDIRECT_URI = process.env.PATREON_REDIRECT;

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing code');
  }

  const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return res.status(400).send('OAuth failed: ' + JSON.stringify(tokenData));
  }

  // Set access token as cookie
  res.setHeader('Set-Cookie', cookie.serialize('patreon_token', tokenData.access_token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  }));

  // Redirect back to watch with saved video and tier
  res.redirect('/');
}
