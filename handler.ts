export const hello = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda + Serverless v4!" }),
  };
};
