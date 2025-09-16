import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { confirmUserBySelf, initiateLogin, signUpUser } from '../helpers/auth';
import { CognitoIdToken, encrypt } from '../helpers/util';

const router = express.Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, name, preferred_username } = req.body;

    if (!username || !password || !email || !name || !preferred_username) {
      return res.status(400).json({
        success: false,
        message:
          'username, password, email, name and preferred_username are required',
      });
    }

    const result = await signUpUser({
      username,
      password,
      email,
      name,
      preferred_username,
    });
    return res
      .status(result?.$metadata?.httpStatusCode ?? 200)
      .json({ success: true, message: 'signup_ok', data: result });
  } catch (err: any) {
    console.error(err.message);
    const msg = err?.message || JSON.stringify(err);
    return res
      .status(500)
      .json({ success: false, message: `Signup failed: ${err.message}` });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: 'username and password required' });

    const auth = await initiateLogin({ username, password });

    const idToken = auth.AuthenticationResult?.IdToken;
    const decoded = jwt.decode(idToken ?? '', { complete: true });
    const {
      sub: user_id,
      email,
      'cognito:username': user_name,
    } = decoded?.payload as CognitoIdToken;

    const user = encrypt(
      JSON.stringify({
        ...auth.AuthenticationResult,
        user: { user_id, email, user_name },
      }),
    );

    return res.status(200).json({
      success: true,
      data: {
        user,
        user_id,
        username: user_name,
      },
    });
  } catch (err: any) {
    console.error(err.message);
    const status = err?.$metadata?.httpStatusCode || 500;
    return res
      .status(status)
      .json({ success: false, message: `Login failed: ${err.message}` });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { username, code } = req.body;
    if (!username || !code)
      return res
        .status(400)
        .json({ success: false, message: 'username and code required' });

    await confirmUserBySelf(username, code);
    return res.status(200).json({
      success: true,
      message: `✅ User ${username} confirmed`,
    });
  } catch (err: any) {
    console.error('Error confirming user:', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to confirm user', message: err.message });
  }
});

export default router;
