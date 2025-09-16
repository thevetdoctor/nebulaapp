import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiGateway = new AWS.ApiGatewayManagementApi({
  region: process.env.AWS_REGION || 'eu-north-1',
  endpoint: process.env.WEBSOCKET_ENDPOINT || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID! || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! || '',
});

interface User {
  id: string;
  score: number;
  username: string;
  connectionId: string;
}

export async function notifyUserIfHighScore(user: User) {
  if (user.score) {
    if (user.score > 1000) {
      const message = {
        message: `Congratulations ${user.username}, you have a new high score of ${user.score}!`,
      };

      try {
        console.log(user);
        if (!user.connectionId) {
          console.warn(`❌ User ${user.id} has no connectionId`);
          return;
        }
        const notifyResponse = await apiGateway
          .postToConnection({
            ConnectionId: user.connectionId,
            Data: JSON.stringify(message),
          })
          .promise();
        console.log('Response', notifyResponse);
        console.log(`✅ Sent high-score message to user ${user.id}`);
      } catch (err: any) {
        if (err.statusCode === 410) {
          console.warn(
            `❌ Connection ${user.connectionId} is stale, remove from DB`,
            err,
          );
        } else {
          console.error(`⚠️ Failed to send message:`, err);
        }
      }
    }
  }
}
