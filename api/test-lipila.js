export default async function handler(req, res) {
  const LIPILA_API_KEY = process.env.LIPILA_API_KEY;
  
  if (!LIPILA_API_KEY) {
    return res.status(500).json({
      error: 'API key missing',
      message: 'LIPILA_API_KEY environment variable is not set'
    });
  }
  
  // Test the Lipila API with a minimal request
  try {
    const testPayload = {
      callbackUrl: 'https://test.com/callback',
      referenceId: 'test-' + Date.now(),
      amount: 1,
      narration: 'Test',
      accountNumber: '260977123456',
      currency: 'ZMW',
      backUrl: 'https://test.com',
      redirectUrl: 'https://test.com'
    };
    
    const response = await fetch('https://api.lipila.dev/api/v1/collections/mobile-money', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': LIPILA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseText = await response.text();
    
    res.status(200).json({
      apiKeyConfigured: true,
      apiKeyPreview: LIPILA_API_KEY.substring(0, 8) + '...',
      lipilaResponseStatus: response.status,
      lipilaResponseStatusText: response.statusText,
      lipilaResponseBody: responseText.substring(0, 500),
      isJsonResponse: false
    });
  } catch (error) {
    res.status(500).json({
      apiKeyConfigured: true,
      error: error.message,
      stack: error.stack
    });
  }
}
