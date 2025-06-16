import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const getTypeFromPort = (proxyString) => {
  try {
    const port = parseInt(proxyString.split(':')[1], 10);
    
    switch (port) {
      case 3129:
      case 80:
      case 8080:
        return 'HTTP';
      case 443:
      case 8443:
        return 'HTTPS';
      case 1080:
        return 'SOCKS5';
      case 1081:
        return 'SOCKS4';
      default:
        return 'Proxy'; 
    }
  } catch {
    return 'Unknown';
  }
};

app.post('/api/check-proxy', async (req, res) => {
  const { proxy } = req.body;

  if (!proxy || !proxy.includes(':')) {
    return res.status(400).json({ isValid: false, error: 'Invalid proxy format' });
  }

  const ipAddress = proxy.split(':')[0];
  const agent = new HttpsProxyAgent(`http://${proxy}`);
  let latency = -1;
  let anonymity = 'Unknown';

  try {
    // --- Combined Latency and Anonymity Check ---
    const startTime = Date.now();
    const anonymityCheckResponse = await axios.get('http://httpbin.org/get', { 
      httpsAgent: agent, 
      timeout: 10000 
    });
    latency = Date.now() - startTime; // Latency is now calculated from this successful request

    const headers = anonymityCheckResponse.data.headers;
    if (!headers['X-Forwarded-For'] && !headers['Via']) {
        anonymity = 'Elite';
    } else if (headers['X-Forwarded-For']) {
        anonymity = 'Transparent';
    } else {
        anonymity = 'Anonymous';
    }

    // --- IP-API Check (No longer needs to be inside the main try-catch for proxy errors) ---
    const apiURL = `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,proxy,hosting`;
    const response = await axios.get(apiURL, { timeout: 10000 });
    const data = response.data;

    if (data.status === 'success') {
      const isProxy = data.proxy || data.hosting;
      let apiType = 'Direct';
      if (data.proxy) apiType = 'Proxy';
      else if (data.hosting) apiType = 'Hosting';

      res.json({
        proxy: proxy,
        isValid: true, // If we reached here, the proxy itself is working
        apiType: apiType,
        portType: getTypeFromPort(proxy),
        location: data.countryCode || 'Unknown',
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        isp: data.as || 'Unknown',
        latency: latency,
        anonymity: anonymity,
      });
    } else {
      // This error is from ip-api.com, not the proxy itself
      throw new Error(data.message || 'Failed to get data from IP-API.com');
    }
  } catch (error) {
    console.error(`Error checking ${proxy}: ${error.message}`);
    res.json({
      proxy,
      isValid: false,
      apiType: 'Error',
      portType: error.code === 'ECONNABORTED' ? 'Timeout' : 'Error'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend running on http://localhost:${PORT}`);
});