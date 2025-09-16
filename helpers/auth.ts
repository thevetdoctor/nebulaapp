// src/cognito.ts
import {
  AdminConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ListUserPoolsCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const REGION = process.env.AWS_REGION || 'eu-north-1';
const client = new CognitoIdentityProviderClient({ region: REGION });

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID! || '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID! || '';
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || '';

function computeSecretHash(username: string) {
  if (!CLIENT_SECRET) return undefined;
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
  hmac.update(username + CLIENT_ID);
  return hmac.digest('base64');
}

export async function signUpUser({
  username,
  password,
  email,
  name,
  preferred_username,
}: {
  username: string;
  password: string;
  email: string;
  name: string;
  preferred_username: string;
}) {
  const secretHash = computeSecretHash(username);
  const input = {
    ClientId: CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
      { Name: 'preferred_username', Value: preferred_username },
    ] as any,
    SecretHash: secretHash,
  };

  const cmd = new SignUpCommand(input);
  return client.send(cmd);
}

export async function initiateLogin({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const secretHash = computeSecretHash(username);
  const input = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      ...(secretHash ? { SECRET_HASH: secretHash } : {}),
    },
  } as any;

  const cmd = new InitiateAuthCommand(input);
  return client.send(cmd);
}

// Optional: admin confirm (if you want to auto-confirm users via admin privileges)
export async function adminConfirm(username: string) {
  const cmd = new AdminConfirmSignUpCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
  });
  return client.send(cmd);
}

export async function confirmUserBySelf(username: string, code: number) {
  const secretHash = computeSecretHash(username);
  const confirmCommand = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: username,
    ConfirmationCode: code.toString(),
    SecretHash: secretHash,
  });

  await client.send(confirmCommand);
  console.log('✅ User confirmed successfully');
  return true;
}

export async function confirmUser(username: string) {
  const command = new AdminConfirmSignUpCommand({
    UserPoolId: USER_POOL_ID!,
    Username: username,
  });

  await client.send(command);
  console.log(`✅ User ${username} confirmed`);
}

async function getUserPools() {
  const command = new ListUserPoolsCommand({ MaxResults: 10 });
  const response = await client.send(command);
  console.log(response.UserPools);
}

// getUserPools();
