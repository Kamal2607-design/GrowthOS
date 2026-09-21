import bcrypt from 'bcryptjs';
import { db } from '../prisma/db.ts';
import jwt from 'jsonwebtoken';

export async function registerUser({ email, password, name, username }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await db.orm.public.User.first({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.orm.public.User.create({
    email: normalizedEmail,
    passwordHash,
    name: name?.trim() || null,
    username: username?.trim() || null,
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.orm.public.User.first({
    email: normalizedEmail,
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.passwordHash) {
    throw new Error('OAUTH_ACCOUNT');
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

   const token = createAuthToken(user);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    },
  };
}

export function createAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

export async function loginOrCreateGoogleUser({
  providerAccountId,
  email,
  name,
}) {
  const existingOAuthAccount =
    await db.orm.public.OAuthAccount.first({
      provider: 'google',
      providerAccountId,
    });

  if (existingOAuthAccount) {
    const existingUser = await db.orm.public.User.first({
      id: existingOAuthAccount.userId,
    });

    if (!existingUser) {
      throw new Error('OAUTH_USER_NOT_FOUND');
    }

    return existingUser;
  }

  const existingUser = await db.orm.public.User.first({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    const oauthAccount = await db.orm.public.OAuthAccount.create({
      provider: 'google',
      providerAccountId,
      userId: existingUser.id,
    });

    return existingUser;
  }

  const newUser = await db.orm.public.User.create({
    email: email.toLowerCase(),
    name: name || null,
    passwordHash: null,
  });

  await db.orm.public.OAuthAccount.create({
    provider: 'google',
    providerAccountId,
    userId: newUser.id,
  });

  return newUser;
}