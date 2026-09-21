import * as oidc from 'openid-client';

let googleConfigPromise;

async function getGoogleConfig() {
  if (!googleConfigPromise) {
    googleConfigPromise = oidc.discovery(
      new URL('https://accounts.google.com'),
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  return googleConfigPromise;
}

export async function createGoogleAuthorizationUrl() {
  const config = await getGoogleConfig();

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();

  const codeChallenge =
    await oidc.calculatePKCECodeChallenge(codeVerifier);

  const authorizationUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    authorizationUrl,
    state,
    nonce,
    codeVerifier,
  };
}

export async function handleGoogleCallback({
  callbackUrl,
  state,
  nonce,
  codeVerifier,
}) {
  const config = await getGoogleConfig();

  const tokens = await oidc.authorizationCodeGrant(
    config,
    callbackUrl,
    {
      expectedState: state,
      expectedNonce: nonce,
      pkceCodeVerifier: codeVerifier,
      idTokenExpected: true,
    }
  );

  const claims = tokens.claims();

  return {
    claims,
    tokens,
  };
}