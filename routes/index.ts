import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { ddbDocClient } from '../database/index';
import { notifyUserIfHighScore } from '../helpers/notify';

const router = express.Router();
const TABLE_NAME = process.env.LEADERBOARD_TABLE! || 'leaderboard';

router.post('/score', async (req: Request, res: Response) => {
  try {
    const { user_id, user_name, score } = req.body;
    if (!user_id || !user_name || score === undefined)
      return res
        .status(400)
        .json({ message: 'user_id, user_name and score required' });
    const connectionId = req.headers['connectionid'] as string;
    if (!connectionId) {
       return res
        .status(400)
        .json({ message: 'Connection ID is required, please reconnect' });
    }

    const item = {
      id: uuidv4(),
      user_id,
      user_name,
      score,
      timestamp: Date.now(),
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    await notifyUserIfHighScore({
      id: user_id,
      connectionId,
      username: user_name,
      score,
    });

    return res.status(201).json({ success: true, item });
  } catch (err: any) {
    console.error('Error saving score:', err.message);
    return res.status(500).json({ success: false, message: `Failed to save score: ${err.message}` });
  }
});

router.delete('/score/:id', async (req: Request, res: Response) => {
  try {
    const { userid: user_id, username: user_name } = req.headers;
    const score_id = req.params.id;
    if (!user_id || !user_name || !score_id)
      return res
        .status(400)
        .json({ message: 'user_id, user_name and score required' });

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          id: score_id,
        },
      }),
    );

    return res.status(200).json({ success: true, message: 'Score deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting score:', err);
    return res.status(500).json({ success: false, message: `Failed to delete score: ${err.message}` });
  }
});

router.get('/top', async (req: Request, res: Response) => {
  try {
    const data = await ddbDocClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      }),
    );

    const top = data.Items?.sort((a, b) => b.score - a.score)[0];
    return res.status(200).json({ data: [top], count: data.Items?.length });
  } catch (err: any) {
    console.error('Error retrieving leaderboard highest score:', err);
    res.status(500).json({
      error: 'Failed to retrieve leaderboard highest score',
      message: err.message,
    });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const { limit, lastKey } = req.query;
    const limitNum = parseInt(limit as string, 10) || 5;
    const params: ScanCommandInput = {
      TableName: TABLE_NAME,
      Limit: limitNum,
    };

    const countParams: ScanCommandInput = {
      TableName: TABLE_NAME,
      Select: 'COUNT',
    };

    const countData = await ddbDocClient.send(new ScanCommand(countParams));
    const totalCount = countData.Count ?? 0;

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(lastKey as string);
    }
    const data = await ddbDocClient.send(new ScanCommand(params));
    const top = data.Items || [];

    return res.status(200).json({
      data: top,
      count: totalCount,
      lastKey: JSON.stringify(data.LastEvaluatedKey) || null,
    });
  } catch (err: any) {
    console.error('Error retrieving leaderboard scores:', err);
    res.status(500).json({
      error: 'Failed to retrieve leaderboard scores',
      message: err.message,
    });
  }
});

export default router;
