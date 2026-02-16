const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lqdodhyovotxyjhinjgd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
          return {
                  statusCode: 405,
                  body: JSON.stringify({ error: 'Method not allowed' })
          };
    }

    try {
          const body = JSON.parse(event.body);
          const { referrerEmail, inviteeEmail, testName, primaryDimension } = body;

      if (!referrerEmail || !inviteeEmail) {
              return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Missing email addresses' })
              };
      }

      const { data, error } = await supabase
            .from('referrals')
            .insert([{
                      referrer_email: referrerEmail,
                      invitee_email: inviteeEmail,
                      test_name: testName || 'Unknown',
                      primary_dimension: primaryDimension || 'Unknown',
                      status: 'pending',
                      created_at: new Date().toISOString()
            }])
            .select();

      if (error) throw error;

      return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                        success: true,
                        referralId: data[0]?.id || null
              })
      };
    } catch (error) {
          console.error('Error creating referral:', error);
          return {
                  statusCode: 500,
                  body: JSON.stringify({ error: error.message })
          };
    }
};
