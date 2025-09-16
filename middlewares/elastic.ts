import { Client } from '@elastic/elasticsearch';

import {
  appName,
  elasticActive,
  elasticAdmin,
  elasticPass,
  elasticUrl,
} from '../helpers/util';

const auth = {
  username: elasticAdmin,
  password: elasticPass,
};

const client = new Client({
  node: elasticUrl,
  auth,
  // headers: {
  //   'Content-Type': 'application/json'  // 👈 Force compatible Content-Type
  // },
  // compatibility: true
  //   auth: { apiKey: 'base64EncodedKey' }
});

export const esTransportOptions = {
  level: 'info',
  client,
  indexPrefix: `${appName.toLowerCase()}`,
};
export const elastic = async (index: string, data: any) => {
  if (elasticActive) {
    try {
      console.log('Index data', index, elasticUrl);
      const time = new Date().toISOString();
      // Ensure index exists
      const exists = await client.indices.exists({ index });
      // console.log('exists', exists);
      if (!exists) {
        await client.indices.create({
          index,
          body: {
            settings: {
              'index.mapping.total_fields.limit': 5000,
            },
            mappings: {
              properties: {
                time: { type: 'date' },
                // add your fields here if you want to control mapping
              },
            },
          },
        });

        await client.index({
          index,
          body: {
            ...data,
            time,
          },
        });
      } else {
        await client.indices.putSettings({
          index: index,
          body: { 'index.mapping.total_fields.limit': 5000 },
        });

        await client.index({
          index,
          body: {
            ...data,
            time,
          },
        });
      }

      console.log('Refresh Index', index);
      await client.indices.refresh({ index });
    } catch (e) {
      console.log('error', e);
    }
  } else {
    console.log('ELASTIC_ACTIVE: ', elasticActive);
  }
};
