import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_mining_jwt_secret_dev_key_2026';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Operator';
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
