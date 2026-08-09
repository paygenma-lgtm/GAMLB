import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'postmessage'
);

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function issueSession(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d', issuer: 'gamlb-api', audience: 'gamlb-web' }
  );
}

export function verifySession(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'gamlb-api',
    audience: 'gamlb-web'
  });
}

export async function exchangeGoogleCode(code) {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) throw new Error('Google did not return an ID token');
  return verifyGoogleCredential(tokens.id_token);
}

export async function verifyGoogleCredential(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google account is not verified');
  }
  return {
    provider: 'google',
    providerId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email,
    avatar: payload.picture || null
  };
}
