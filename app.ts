import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import * as os from 'os';

import { EnvironmentTypes, appName, env, responseObj } from './helpers/util';
import { logMiddleware } from './middlewares/logger';
import authRouter from './routes/auth';
import leaderboardRouter from './routes/index';

// Function to get internal IP
function getInternalIP() {
  const interfaces: any = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'IP not found';
}

// Get system info
const hostname = os.hostname();
const internalIP = getInternalIP();

// Log to console
console.log(`OS Hostname: ${hostname}`);
console.log(`Internal IP: ${internalIP}`);

const app = express();
app.use(express.json());
app.use(cors());
if (env !== EnvironmentTypes.TEST) {
  app.use(logMiddleware);
}

app.use('/leaderboard', leaderboardRouter);
app.use('/auth', authRouter);

app.get('/', async (req: Request, res: Response) => {
  const message = `Welcome to ${appName}`;
  responseObj(res, 200, { hostname, internalIP }, message);
});
// Handles all errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(err.status || 400).send({ success: false });
  }
  console.log(err.stack);
  if (err) console.error(`Error: ${err.message}`);
  return res
    .status(err.status || 400)
    .send({ success: false, message: err.message });
});

export default app;
