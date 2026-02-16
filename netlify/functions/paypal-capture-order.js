const https = require('https');

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const APP_SECRET = process.env.PAYPAL_SECRET;

async function getAccessToken() {
    return new Promise((resolve, reject) => {
          const auth = Buffer.from(`${CLIENT_ID}:${APP_SECRET}`).toString('base64');

                           const options = {
                                   hostname: 'api.sandbox.paypal.com',
                                   path: '/v1/oauth2/token',
                                   method: 'POST',
                                   headers: {
                                             'Authorization': `Basic ${auth}`,
                                             'Content-Type': 'application/x-www-form-urlencoded'
                                   }
                           };

                           const req = https.request(options, (res) => {
                                   let data = '';
                                   res.on('data', chunk => data += chunk);
                                   res.on('end', () => {
                                             try {
                                                         const parsed = JSON.parse(data);
                                                         resolve(parsed.access_token);
                                             } catch(e) {
                                                         reject(new Error('Token parse error'));
                                             }
                                   });
                           });

                           req.on('error', reject);
          req.write('grant_type=client_credentials');
          req.end();
    });
}

async function captureOrder(accessToken, orderId) {
    return new Promise((resolve, reject) => {
          const options = {
                  hostname: 'api.sandbox.paypal.com',
                  path: `/v2/checkout/orders/${orderId}/capture`,
                  method: 'POST',
                  headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                  }
          };

                           const req = https.request(options, (res) => {
                                   let data = '';
                                   res.on('data', chunk => data += chunk);
                                   res.on('end', () => {
                                             try {
                                                         const parsed = JSON.parse(data);
                                                         resolve(parsed);
                                             } catch(e) {
                                                         reject(new Error('Capture parse error'));
                                             }
                                   });
                           });

                           req.on('error', reject);
          req.end();
    });
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
          return {
                  statusCode: 405,
                  body: JSON.stringify({ error: 'Method not allowed' })
          };
    }

    try {
          const body = JSON.parse(event.body);
          const { orderId } = body;

      if (!orderId) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Missing orderId' })
              };
      }

      const accessToken = await getAccessToken();
          const result = await captureOrder(accessToken, orderId);

      return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        status: result.status,
                        paymentStatus: result.purchase_units?.[0]?.payments?.captures?.[0]?.status || 'UNKNOWN'
              })
      };
    } catch (error) {
          console.error('Error capturing order:', error);
          return {
                  statusCode: 500,
                  body: JSON.stringify({ error: error.message })
          };
    }
};
