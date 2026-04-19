// /api/create-payment.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST
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
    
    console.log('=== DEBUGGING INFO ===');
    console.log('LIPILA_API_KEY exists:', !!LIPILA_API_KEY);
    console.log('LIPILA_API_KEY length:', LIPILA_API_KEY ? LIPILA_API_KEY.length : 0);
    
    if (!LIPILA_API_KEY) {
      console.error('❌ LIPILA_API_KEY environment variable is NOT SET');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'Payment service API key is missing. Please set LIPILA_API_KEY in Vercel environment variables.'
      });
    }

    console.log('✅ LIPILA_API_KEY found');

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

    console.log('[Lipila] Sending request to Lipila API');
    console.log('[Lipila] Payload:', JSON.stringify(lipilaPayload, null, 2));

    // Call Lipila API with better error handling
    let response;
    try {
      response = await fetch('https://api.lipila.dev/api/v1/collections/mobile-money', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': LIPILA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lipilaPayload)
      });
    } catch (fetchError) {
      console.error('[Lipila] Network error:', fetchError);
      return res.status(502).json({ 
        error: 'Network error', 
        message: 'Cannot reach Lipila API. Please check your connection or API endpoint.',
        details: fetchError.message
      });
    }

    console.log('[Lipila] Response status:', response.status);
    console.log('[Lipila] Response status text:', response.statusText);
    console.log('[Lipila] Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response as text first (to handle empty responses)
    const responseText = await response.text();
    console.log('[Lipila] Raw response length:', responseText.length);
    console.log('[Lipila] Raw response preview:', responseText.substring(0, 500));
    
    // Try to parse JSON if there's content
    let responseData = {};
    let parseError = null;
    
    if (responseText && responseText.trim().length > 0) {
      try {
        responseData = JSON.parse(responseText);
        console.log('[Lipila] Parsed JSON successfully:', responseData);
      } catch (jsonError) {
        parseError = jsonError;
        console.error('[Lipila] JSON parse error:', jsonError.message);
        console.error('[Lipila] Raw response that failed to parse:', responseText);
      }
    } else {
      console.warn('[Lipila] Empty response body received');
    }

    // Check if Lipila request was successful
    if (!response.ok) {
      // Provide detailed error based on status code
      let errorMessage = 'Payment processing failed';
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid or unauthorized API key. Please check your LIPILA_API_KEY.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request parameters. Check phone number format and amount.';
      } else if (response.status === 404) {
        errorMessage = 'Lipila API endpoint not found. The API URL might have changed.';
      } else if (response.status === 500) {
        errorMessage = 'Lipila server error. Please try again later.';
      }
      
      return res.status(response.status).json({
        error: 'Lipila API error',
        message: errorMessage,
        status: response.status,
        rawResponse: responseText.substring(0, 200), // Send partial for debugging
        parseError: parseError ? parseError.message : null
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: responseData,
      referenceId: referenceId
    });

  } catch (error) {
    console.error('[Lipila] Server error:', error);
    console.error('[Lipila] Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
