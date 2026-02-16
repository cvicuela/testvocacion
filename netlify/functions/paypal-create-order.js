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

async function createOrder(accessToken, amount, description) {
    return new Promise((resolve, reject) => {
          const orderData = JSON.stringify({
                  intent: 'CAPTURE',
                  purchase_units: [{
                            reference_id: 'PURCH_ID_' + Date.now(),
                            amount: {
                                        currency_code: 'USD',
                                        value: amount
                            },
                            description: description
                  }],
                  payer: {
                            email_address: 'customer@example.com'
                  }
          });

                           const options = {
                                   hostname: 'api.sandbox.paypal.com',
                                   path: '/v2/checkout/orders',
                                   method: 'POST',
                                   headers: {
                                             'Authorization': `Bearer ${accessToken}`,
                                             'Content-Type': 'application/json',
                                             'Content-Length': orderData.length
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
                                                         reject(new Error('Order parse error'));
                                             }
                                   });
                           });

                           req.on('error', reject);
          req.write(orderData);
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
          const { amount, description } = body;

      if (!amount || !description) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Missing amount or description' })
              };
      }

      const accessToken = await getAccessToken();
          const order = await createOrder(accessToken, amount, description);

      return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        id: order.id,
                        status: order.status
              })
      };
    } catch (error) {
          console.error('Error creating order:', error);
          return {
                  statusCode: 500,
                  body: JSON.stringify({ error: error.message })
          };
    }
};
