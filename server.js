import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const getTypeFromPort = (proxyString) => {
  try {
    const port = parseInt(proxyString.split(':')[1], 10);
    
    // As requested, if the port is 3129, the type is HTTP
    // You can add more custom port mappings here
    switch (port) {
      case 3129:
        return 'HTTP';
      case 443:
      case 8443:
        return 'HTTPS';
      case 1080:
        return 'SOCKS5';
      case 1081:
        return 'SOCKS4';
      case 80:
      case 8080:
        return 'HTTP';
      default:
        // If the port is not in our list, we can label it generically
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
  const startTime = Date.now();

  try {
    const apiURL = `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,proxy,hosting`;

    const response = await axios.get(apiURL);
    const data = response.data;
    const endTime = Date.now();

    if (data.status === 'success') {
      const isProxy = data.proxy || data.hosting;

      res.json({
        proxy: proxy,
        isValid: isProxy,
        responseTime: endTime - startTime,
        type: isProxy ? getTypeFromPort(proxy) : 'Direct',
        location: data.countryCode || 'Unknown',
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        isp: data.as || 'Unknown', // Using the 'as' field for the ASN
        fraud_score: 0, // No fraud score available from this API
      });
    } else {
      throw new Error(data.message || 'Failed to get data from IP-API.com');
    }
  } catch (error) {
    console.error("Error from IP-API.com:", error.message);
    res.json({ proxy, isValid: false, type: 'Error', error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend (IP-API.com + Port Logic) running on http://localhost:${PORT}`);
});