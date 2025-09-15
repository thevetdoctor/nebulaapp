import { AES, enc } from 'crypto-js';
import { JwtPayload } from 'jsonwebtoken';

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface CognitoIdToken extends JwtPayload {
  sub: string;
  email: string;
  'cognito:username': string;
}

export const encrypt = (data: string) => {
  const key = process.env.ENCRYPTION_KEY || '';
  return AES.encrypt(data, key).toString();
};

export const decrypt = (data: string) => {
  const key = process.env.ENCRYPTION_KEY || '';
  const bytes = AES.decrypt(data, key);
  return bytes.toString(enc.Utf8);
};
