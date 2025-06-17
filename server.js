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
      case 1080:
        return 'SOCKS5';
      case 1081:
        return 'SOCKS4';
      default:
        return 'HTTP'; // Defaulting to HTTP for other common proxy ports
    }
  } catch {
    return 'Unknown';
  }
};

app.post('/api/check-proxy', async (req, res) => {
    // Re-introducing checkCount from the request body
    const { proxy, checkCount = 1 } = req.body;

    if (!proxy) {
        return res.status(400).json({ isValid: false, error: 'Invalid proxy format' });
    }

    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const validationUrl = 'https://httpbin.org/get';

    let successes = 0;
    let totalLatency = 0;
    let anonymity = 'Unknown';

    for (let i = 0; i < checkCount; i++) {
        try {
            const startTime = Date.now();
            const checkResponse = await axios.get(validationUrl, { 
                httpsAgent: agent, 
                timeout: 10000 
            });
            totalLatency += Date.now() - startTime;
            successes++;

            if (i === 0) { 
                const headers = checkResponse.data.headers;
                if (!headers['X-Forwarded-For'] && !headers['Via']) {
                    anonymity = 'Elite';
                } else if (headers['X-Forwarded-For']) {
                    anonymity = 'Transparent';
                } else {
                    anonymity = 'Anonymous';
                }
            }
        } catch (error) {
            console.error(`Check ${i + 1} for ${proxy} failed: ${error.message}`);
        }
    }

    // Calculating health score and average latency
    const healthScore = (successes / checkCount) * 100;
    const averageLatency = successes > 0 ? Math.round(totalLatency / successes) : -1;

    if (successes === 0) {
        return res.json({
            proxy,
            isValid: false,
            portType: 'Unreachable',
            healthScore,
        });
    }

    try {
        const ipAddress = proxy.split(':')[0];
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,proxy,hosting`);

        if (geoResponse.data.status !== 'success') {
            throw new Error('Failed to get geo info');
        }
        
        res.json({
            proxy,
            isValid: true,
            latency: averageLatency,
            healthScore, // Adding healthScore to the successful response
            anonymity,
            portType: getTypeFromPort(proxy),
            location: geoResponse.data.countryCode || 'Unknown',
            city: geoResponse.data.city,
            country: geoResponse.data.country,
            isp: geoResponse.data.as,
            apiType: geoResponse.data.proxy ? 'Proxy' : (geoResponse.data.hosting ? 'Hosting' : 'Direct'),
        });

    } catch (error) {
        console.error(`Check for ${proxy} failed: ${error.message}`);
        res.json({
            proxy,
            isValid: false,
            portType: 'Unreachable',
            healthScore: 0,
        });
    }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend running on http://localhost:${PORT}`);
});