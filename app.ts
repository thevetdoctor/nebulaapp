import cors from 'cors';
import express from 'express';

import authRouter from './routes/auth';
import leaderboardRouter from './routes/index';

const app = express();
app.use(express.json());
app.use(cors());

app.use('/leaderboard', leaderboardRouter);
app.use('/auth', authRouter);

export default app;
