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

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

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

const getErrorMessage = (error) => {
    if (error.response) {
        return `Request failed with status: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
        return 'No response from server. Check proxy connection or target URL.';
    } else {
        return error.message;
    }
};

app.post('/api/check-proxy', async (req, res) => {
    const { proxy, checkCount = 1, expectedString, provider, targetUrl } = req.body; 
    if (!proxy) { return res.status(400).json({ isValid: false, error: 'Invalid proxy format' }); }
    
    let agent;
    const proxyType = getTypeFromPort(proxy);
    if (proxyType === 'SOCKS4' || proxyType === 'SOCKS5') {
        agent = new SocksProxyAgent(`socks://${proxy}`);
    } else {
        agent = new HttpsProxyAgent(`http://${proxy}`);
    }

    const anonymityCheckUrl = 'https://httpbin.org/get';
    let successes = 0;
    let totalLatency = 0;
    let anonymity = 'Unknown';

    for (let i = 0; i < checkCount; i++) {
        try {
            const startTime = Date.now();
            const checkResponse = await axios.get(anonymityCheckUrl, { httpAgent: agent, httpsAgent: agent, timeout: 10000 });
            totalLatency += Date.now() - startTime;
            
            if (expectedString && typeof checkResponse.data === 'string' && !checkResponse.data.includes(expectedString)) {
              throw new Error('Content validation failed: expected string not found.');
            }

            successes++;
            
            if (i === 0) {
              const headers = checkResponse.data.headers;
              if (!headers['X-Forwarded-For'] && !headers['Via']) { anonymity = 'Elite'; }
              else if (headers['X-Forwarded-For']) { anonymity = 'Transparent'; }
              else { anonymity = 'Anonymous'; }
            }
        } catch (error) {
            console.error(`Check ${i + 1} for ${proxy} failed: ${getErrorMessage(error)}`);
        }
    }

    const healthScore = (successes / checkCount) * 100;
    const averageLatency = successes > 0 ? Math.round(totalLatency / successes) : -1;

    if (successes === 0) {
        return res.json({ proxy, isValid: false, portType: 'Unreachable', healthScore });
    }

    try {
        let finalGeoData = {};
        if (provider === 'Cloudflare' && targetUrl) {
            const workerResponse = await axios.get(targetUrl, { httpAgent: agent, httpsAgent: agent, timeout: 10000 });
            const workerData = workerResponse.data;
            finalGeoData = {
                location: workerData.source_country,
                country: workerData.source_country,
                city: 'N/A (CF Worker)',
                isp: 'N/A (CF Worker)',
                apiType: 'Cloudflare'
            };
        } else {
            const ipAddress = proxy.split(':')[0];
            const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as`);
            if (geoResponse.data.status === 'success') {
                finalGeoData = {
                    location: geoResponse.data.countryCode || 'Unknown',
                    city: geoResponse.data.city,
                    country: geoResponse.data.country,
                    isp: geoResponse.data.as,
                    apiType: 'ip-api.com'
                };
            }
        }
        
        res.json({
            proxy, isValid: true, latency: averageLatency, healthScore, anonymity, portType: getTypeFromPort(proxy),
            ...finalGeoData
        });

    } catch (error) {
        console.error(`Geo check for ${proxy} failed: ${error.message}`);
        res.json({ proxy, isValid: true, latency: averageLatency, healthScore, anonymity, portType: getTypeFromPort(proxy) });
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
    const response = await axios.get(testUrl, { httpAgent: agent, httpsAgent: agent, timeout: 10000 });
    const latency = Date.now() - startTime;

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
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Test connection for ${proxy} failed:`, errorMessage);
    res.status(500).json({ 
        success: false, 
        message: errorMessage,
        statusCode: error.response?.status 
    });
  }
});

app.post('/api/auto-fill', async (req, res) => {
  const { email, targetUrl, proxy, selectors, successKeyword } = req.body;
  
  if (!email || !targetUrl || !selectors) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameters: email, targetUrl, or selectors' 
    });
  }

  let browser;
  try {
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ];
    
    if (proxy) {
        const proxyType = getTypeFromPort(proxy);
        if (proxyType === 'HTTP' || proxyType === 'HTTPS') {
          browserArgs.push(`--proxy-server=http://${proxy}`);
        } else if (proxyType === 'SOCKS4') {
          browserArgs.push(`--proxy-server=socks4://${proxy}`);
        } else if (proxyType === 'SOCKS5') {
          browserArgs.push(`--proxy-server=socks5://${proxy}`);
        }
    }

    browser = await puppeteer.launch({
      headless: true,
      args: browserArgs
    });

    const page = await browser.newPage();
    
    let networkResponseText = '';
    page.on('response', async (response) => {
        try {
            const text = await response.text();
            networkResponseText += text + '\n';
        } catch (e) {
            // Ignore errors for responses that have no body
        }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await sleep(2000); 
    
    try {
      await page.waitForSelector(selectors.emailSelector, { timeout: 10000 });
      await page.type(selectors.emailSelector, email);
    } catch (error) {
      throw new Error(`Could not find email field with selector: ${selectors.emailSelector}`);
    }
    
    if (selectors.nameSelector) {
      try {
        await page.waitForSelector(selectors.nameSelector, { timeout: 5000 });
        await page.type(selectors.nameSelector, 'John Doe');
      } catch (error) {
        console.log('Name field not found or not required');
      }
    }
    
    if (selectors.phoneSelector) {
      try {
        await page.waitForSelector(selectors.phoneSelector, { timeout: 5000 });
        await page.type(selectors.phoneSelector, '+1234567890');
      } catch (error) {
        console.log('Phone field not found or not required');
      }
    }
    
    try {
      await page.waitForSelector(selectors.submitSelector, { timeout: 10000 });
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
          page.click(selectors.submitSelector)
      ]);
      
    } catch (error) {
      // This is not a fatal error, as some forms submit without navigation.
      // We will check for the keyword on the current page.
      console.log(`Navigation did not happen after click, or it timed out. This might be expected.`);
    }

    if (successKeyword) {
      await sleep(1000); // Give a moment for any final scripts to run
      const pageContent = await page.content();
      const keywordFound = pageContent.includes(successKeyword) || networkResponseText.includes(successKeyword);
      
      if (!keywordFound) {
        throw new Error(`Keyword "${successKeyword}" not found in UI or network response.`);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully submitted form for ${email}`,
      email: email,
      proxy: proxy || 'Direct Connection'
    });
    
  } catch (error) {
    console.error(`Auto-fill error for ${email}:`, error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Form submission failed',
      email: email,
      proxy: proxy || 'Direct Connection'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.post('/api/custom-test', async (req, res) => {
  const { proxy, targetUrl } = req.body;

  if (!proxy || !targetUrl) {
    return res.status(400).json({ success: false, message: 'Proxy and targetUrl are required.' });
  }

  let browser;
  try {
    const startTime = Date.now();
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ];
    
    const proxyType = getTypeFromPort(proxy);
    if (proxyType === 'HTTP' || proxyType === 'HTTPS') {
      browserArgs.push(`--proxy-server=http://${proxy}`);
    } else if (proxyType === 'SOCKS4') {
      browserArgs.push(`--proxy-server=socks4://${proxy}`);
    } else if (proxyType === 'SOCKS5') {
      browserArgs.push(`--proxy-server=socks5://${proxy}`);
    }

    browser = await puppeteer.launch({ headless: true, args: browserArgs });
    const page = await browser.newPage();
    const response = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    
    if (!response || !response.ok()) {
        throw new Error(`Request failed with status: ${response?.status()}`);
    }

    const responseBody = await response.json();
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      message: `Successfully received response from your endpoint.`,
      status: response.status(),
      latency: latency,
      data: responseBody,
    });
  } catch (error) {
    console.error(`Custom test for ${proxy} to ${targetUrl} failed:`, error.message);
    res.status(500).json({ 
        success: false, 
        message: error.message,
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