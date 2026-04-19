// /api/create-payment.js
export default async function handler(req, res) {
  // Set CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are accepted' 
    });
  }

  try {
    // Get request body
    const { 
      callbackUrl, 
      referenceId, 
      amount, 
      narration, 
      accountNumber, 
      currency = 'ZMW',
      backUrl,
      redirectUrl
    } = req.body;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({ 
        error: 'Missing required field', 
        message: 'amount is required' 
      });
    }

    if (!accountNumber) {
      return res.status(400).json({ 
        error: 'Missing required field', 
        message: 'accountNumber (phone number) is required' 
      });
    }

    if (!referenceId) {
      return res.status(400).json({ 
        error: 'Missing required field', 
        message: 'referenceId is required' 
      });
    }

    // Get API key from environment variables
    const LIPILA_API_KEY = process.env.LIPILA_API_KEY;
    
    if (!LIPILA_API_KEY) {
      console.error('LIPILA_API_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'Payment service is not properly configured' 
      });
    }

    // Prepare payload for Lipila API
    const lipilaPayload = {
      callbackUrl: callbackUrl || 'https://lipila-payment-demo.vercel.app/api/payment-callback',
      referenceId: referenceId,
      amount: Number(amount),
      narration: narration || 'Payment via Lipila',
      accountNumber: accountNumber,
      currency: currency,
      backUrl: backUrl || 'https://lipila-payment-demo.vercel.app/',
      redirectUrl: redirectUrl || 'https://lipila-payment-demo.vercel.app/'
    };

    console.log('[Lipila] Sending request to Lipila API:', JSON.stringify(lipilaPayload, null, 2));

    // Call Lipila API
    const response = await fetch('https://api.lipila.dev/api/v1/collections/mobile-money', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': LIPILA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lipilaPayload)
    });

    // Get response data
    const responseData = await response.json();
    
    console.log('[Lipila] API Response Status:', response.status);
    console.log('[Lipila] API Response Data:', JSON.stringify(responseData, null, 2));

    // Check if Lipila request was successful
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Lipila API error',
        message: responseData.message || 'Payment processing failed',
        details: responseData
      });
    }

    // Return success response to frontend
    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: responseData,
      referenceId: referenceId
    });

  } catch (error) {
    console.error('[Lipila] Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred'
    });
  }
}
