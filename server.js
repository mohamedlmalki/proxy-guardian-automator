import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import puppeteer from 'puppeteer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const getTypeFromPort = (proxyString) => {
  try {
    const port = parseInt(proxyString.split(':')[1], 10);
    switch (port) {
      case 1080: return 'SOCKS5';
      case 1081: return 'SOCKS4';
      default: return 'HTTP';
    }
  } catch {
    return 'Unknown';
  }
};

app.post('/api/check-proxy', async (req, res) => {
    const { proxy, checkCount = 1 } = req.body;
    if (!proxy) { return res.status(400).json({ isValid: false, error: 'Invalid proxy format' }); }
    let agent;
    const proxyType = getTypeFromPort(proxy);
    if (proxyType === 'SOCKS4' || proxyType === 'SOCKS5') {
        agent = new SocksProxyAgent(`socks://${proxy}`);
    } else {
        agent = new HttpsProxyAgent(`http://${proxy}`);
    }
    const validationUrl = 'https://httpbin.org/get';
    let successes = 0;
    let totalLatency = 0;
    let anonymity = 'Unknown';
    for (let i = 0; i < checkCount; i++) {
        try {
            const startTime = Date.now();
            const checkResponse = await axios.get(validationUrl, { httpsAgent: agent, timeout: 10000 });
            totalLatency += Date.now() - startTime;
            successes++;
            if (i === 0) {
                const headers = checkResponse.data.headers;
                if (!headers['X-Forwarded-For'] && !headers['Via']) { anonymity = 'Elite'; }
                else if (headers['X-Forwarded-For']) { anonymity = 'Transparent'; }
                else { anonymity = 'Anonymous'; }
            }
        } catch (error) {
            console.error(`Check ${i + 1} for ${proxy} failed: ${error.message}`);
        }
    }
    const healthScore = (successes / checkCount) * 100;
    const averageLatency = successes > 0 ? Math.round(totalLatency / successes) : -1;
    if (successes === 0) {
        return res.json({ proxy, isValid: false, portType: 'Unreachable', healthScore });
    }
    try {
        const ipAddress = proxy.split(':')[0];
        const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,proxy,hosting`);
        if (geoResponse.data.status !== 'success') { throw new Error('Failed to get geo info'); }
        res.json({
            proxy, isValid: true, latency: averageLatency, healthScore, anonymity, portType: proxyType,
            location: geoResponse.data.countryCode || 'Unknown', city: geoResponse.data.city,
            country: geoResponse.data.country, isp: geoResponse.data.as,
            apiType: geoResponse.data.proxy ? 'Proxy' : (geoResponse.data.hosting ? 'Hosting' : 'Direct'),
        });
    } catch (error) {
        console.error(`Check for ${proxy} failed: ${error.message}`);
        res.json({ proxy, isValid: false, portType: 'Unreachable', healthScore: 0 });
    }
});

app.post('/api/test-connection', async (req, res) => {
  const { proxy } = req.body;
  if (!proxy) {
    return res.status(400).json({ success: false, message: 'Proxy not provided.' });
  }

  let agent;
  const proxyType = getTypeFromPort(proxy);
  if (proxyType === 'SOCKS4' || proxyType === 'SOCKS5') {
      agent = new SocksProxyAgent(`socks://${proxy}`);
  } else {
      agent = new HttpsProxyAgent(`http://${proxy}`);
  }

  const testUrl = 'https://httpbin.org/get';

  try {
    const startTime = Date.now();
    const response = await axios.get(testUrl, { httpsAgent: agent, timeout: 10000 });
    const latency = Date.now() - startTime;

    if (response.status === 200) {
      const originIp = response.data.origin.split(',')[0];
      const headers = response.data.headers;

      let anonymity = 'Unknown';
      if (!headers['X-Forwarded-For'] && !headers['Via']) {
          anonymity = 'Elite (Good Privacy)';
      } else if (headers['X-Forwarded-For']) {
          anonymity = 'Transparent (IP Exposed)';
      } else {
          anonymity = 'Anonymous';
      }

      const geoResponse = await axios.get(`http://ip-api.com/json/${originIp}?fields=status,message,country,city`);

      let location = 'Unknown';
      if (geoResponse.data.status === 'success') {
        location = `${geoResponse.data.city || 'N/A'}, ${geoResponse.data.country || 'N/A'}`;
      }

      res.json({
        success: true,
        message: `Latency: ${latency}ms, IP: ${originIp}`,
        ip: originIp,
        anonymity: anonymity,
        location: location,
        latency: latency,
      });
    } else {
      res.json({ success: false, message: `Failed with status: ${response.status}` });
    }
  } catch (error) {
    console.error(`Test connection for ${proxy} failed:`, error.message);
    res.status(500).json({ success: false, message: 'Connection timed out or failed.' });
  }
});

app.post('/api/auto-fill', async (req, res) => {
  const { email, targetUrl, proxy, selectors } = req.body;
  
  if (!email || !targetUrl || !proxy || !selectors) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameters: email, targetUrl, proxy, or selectors' 
    });
  }

  let browser;
  try {
    // Launch browser with proxy
    const proxyType = getTypeFromPort(proxy);
    const [proxyHost, proxyPort] = proxy.split(':');
    
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ];

    if (proxyType === 'HTTP' || proxyType === 'HTTPS') {
      browserArgs.push(`--proxy-server=http://${proxy}`);
    } else if (proxyType === 'SOCKS4') {
      browserArgs.push(`--proxy-server=socks4://${proxy}`);
    } else if (proxyType === 'SOCKS5') {
      browserArgs.push(`--proxy-server=socks5://${proxy}`);
    }

    browser = await puppeteer.launch({
      headless: true,
      args: browserArgs
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to target URL
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait a bit for page to fully load
    await page.waitForTimeout(2000);
    
    // Fill email field
    try {
      await page.waitForSelector(selectors.emailSelector, { timeout: 10000 });
      await page.type(selectors.emailSelector, email);
    } catch (error) {
      throw new Error(`Could not find email field with selector: ${selectors.emailSelector}`);
    }
    
    // Fill name field if selector provided
    if (selectors.nameSelector) {
      try {
        await page.waitForSelector(selectors.nameSelector, { timeout: 5000 });
        await page.type(selectors.nameSelector, 'John Doe');
      } catch (error) {
        console.log('Name field not found or not required');
      }
    }
    
    // Fill phone field if selector provided
    if (selectors.phoneSelector) {
      try {
        await page.waitForSelector(selectors.phoneSelector, { timeout: 5000 });
        await page.type(selectors.phoneSelector, '+1234567890');
      } catch (error) {
        console.log('Phone field not found or not required');
      }
    }
    
    // Submit form
    try {
      await page.waitForSelector(selectors.submitSelector, { timeout: 10000 });
      await page.click(selectors.submitSelector);
      
      // Wait for navigation or response
      await page.waitForTimeout(3000);
      
    } catch (error) {
      throw new Error(`Could not find or click submit button with selector: ${selectors.submitSelector}`);
    }
    
    res.json({
      success: true,
      message: `Successfully submitted form for ${email}`,
      email: email,
      proxy: proxy
    });
    
  } catch (error) {
    console.error(`Auto-fill error for ${email}:`, error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Form submission failed',
      email: email,
      proxy: proxy
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend running on http://localhost:${PORT}`);
});