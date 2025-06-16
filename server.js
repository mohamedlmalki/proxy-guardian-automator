import express from 'express';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const app = express();
app.use(express.json());

const IPQS_API_KEY = '9HkyeGF3mn0eKama3lp2l4s4zWxCCvNk';

// --- NEW: Function to determine proxy type from port ---
const getTypeFromPort = (proxyString) => {
  const port = parseInt(proxyString.split(':')[1], 10);
  if (!port) return 'HTTP'; // Default to HTTP

  switch (port) {
    case 443:
    case 8443:
      return 'HTTPS';
    case 1080:
      return 'SOCKS5';
    case 1081:
    case 1082:
      return 'SOCKS4';
    // You can add more common ports here
    default:
      return 'HTTP'; // Assume HTTP for other common ports like 80, 3128, 8080
  }
};
// ----------------------------------------------------

app.post('/api/check-proxy', async (req, res) => {
  const { proxy } = req.body;
  
  if (!proxy || !proxy.includes(':')) {
    return res.status(400).json({ isValid: false, error: 'Invalid proxy format' });
  }

  const ipAddress = proxy.split(':')[0];
  const startTime = Date.now();

  try {
    const apiURL = `https://ipqualityscore.com/api/json/ip/${IPQS_API_KEY}/${ipAddress}`;
    const response = await axios.get(apiURL);
    const data = response.data;
    const endTime = Date.now();

    if (data.success && data.proxy) {
      
      // Use the API's type if available, otherwise guess from the port
      const proxyType = data.proxy_type || getTypeFromPort(proxy);

      res.json({
        isValid: true,
        responseTime: endTime - startTime,
        type: proxyType, // Use our determined type
        location: data.country_code || 'Unknown',
        city: data.city || 'Unknown',
        isp: data.ISP || 'Unknown',
        fraud_score: data.fraud_score || 0,
      });
    } else {
      throw new Error(data.message || 'Not a valid proxy according to IPQualityScore');
    }
  } catch (error) {
    console.error("Error from IPQualityScore API:", error.message);
    res.json({ isValid: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend (IPQualityScore) running on http://localhost:${PORT}`);
});