import { AES, enc } from 'crypto-js';
import dotenv from 'dotenv';
import { Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

dotenv.config();
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

export const appName = process.env.APP_NAME ?? 'NEBULA_APP';
export const env = process.env.NODE_ENV || 'development';
export enum EnvironmentTypes {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export const elasticUrl = process.env.ELASTIC_URL
  ? process.env.ELASTIC_URL
  : 'http://localhost:9200';
export const elasticAdmin = process.env.ELASTIC_ADMIN ?? 'elastic';
export const elasticPass = process.env.ELASTIC_PASS ?? 'changeme';
export const elasticActive =
  (process.env.ELASTIC_ACTIVE || '').toLowerCase() === 'true';

export const responseObj = (
  res: Response,
  status: number,
  data: any,
  message?: string,
): Response => {
  return res.status(status).json({
    status,
    success: status >= 200 && status < 300,
    ...(data !== null && data !== undefined && { data }),
    message,
  });
};
