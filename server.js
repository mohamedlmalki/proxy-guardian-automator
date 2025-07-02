// FINAL AND COMPLETE server.js FILE
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';

// Apply the stealth plugin for anti-detection
puppeteer.use(StealthPlugin());

// Ensure 'screenshots' directory exists for debugging
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)){
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const randomSleep = (min, max) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

const moveMouseLikeHuman = async (page, element) => {
    const box = await element.boundingBox();
    if (!box) {
        return;
    }
    const startX = Math.floor(Math.random() * 100) + 50;
    const startY = Math.floor(Math.random() * 100) + 50;
    await page.mouse.move(startX, startY, { steps: 5 });
    await sleep(100);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await sleep(200);
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

const COMMON_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

const generateRandomName = () => 'John Doe';

const getTypeFromPort = (proxyString) => {
  try {
    const port = parseInt(proxyString.split(':')[1], 10);
    if (port === 1080) return 'SOCKS5';
    if (port === 1081) return 'SOCKS4';
    return 'HTTP';
  } catch {
    return 'Unknown';
  }
};

const getErrorMessage = (error) => {
    if (error.response) return `Request failed with status: ${error.response.status} ${error.response.statusText}`;
    if (error.request) return 'No response from server. Check proxy or target URL.';
    return error.message;
};

// Endpoint for the Proxy Checker
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

// Endpoint for the Proxy Switcher's health checks
app.post('/api/test-connection', async (req, res) => {
  const { proxy } = req.body;
  if (!proxy) { return res.status(400).json({ success: false, message: 'Proxy not provided.' }); }

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
    if (!headers['X-Forwarded-For'] && !headers['Via']) { anonymity = 'Elite (Good Privacy)'; }
    else if (headers['X-Forwarded-For']) { anonymity = 'Transparent (IP Exposed)'; }
    else { anonymity = 'Anonymous'; }
    const geoResponse = await axios.get(`http://ip-api.com/json/${originIp}?fields=status,message,country,city`);
    let location = 'Unknown';
    if (geoResponse.data.status === 'success') {
      location = `${geoResponse.data.city || 'N/A'}, ${geoResponse.data.country || 'N/A'}`;
    }
    res.json({ success: true, message: `Latency: ${latency}ms, IP: ${originIp}`, ip: originIp, anonymity, location, latency });
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error), statusCode: error.response?.status });
  }
});

// Endpoint for the Auto Filler
app.post('/api/auto-fill', async (req, res) => {
  // This line is now corrected to receive the settings from the frontend
  const { email, targetUrl, proxy, selectors, antiDetect, successKeyword, sessionData } = req.body;
  
  if (!email || !targetUrl || !selectors) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
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
      '--disable-gpu',
      '--window-position=0,0'
    ];
    
    if (proxy) {
        const proxyType = getTypeFromPort(proxy);
        if (proxyType.startsWith('SOCKS')) {
          browserArgs.push(`--proxy-server=socks5://${proxy}`);
        } else {
          browserArgs.push(`--proxy-server=http://${proxy}`);
        }
    }

    // This logic correctly uses the 'showBrowser' setting from your UI
    browser = await puppeteer.launch({
      headless: !(antiDetect && antiDetect.showBrowser),
      args: browserArgs
    });

    const page = await browser.newPage();
    
    // Logic to randomize viewport and spoof screen properties
    if (antiDetect && antiDetect.disguiseFingerprint) {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setUserAgent(userAgent);
      
      const viewport = COMMON_VIEWPORTS[Math.floor(Math.random() * COMMON_VIEWPORTS.length)];
      console.log(`[DEBUG] Setting viewport and spoofing screen to: ${viewport.width}x${viewport.height}`);
      
      await page.setViewport({ ...viewport, deviceScaleFactor: 1 });

      await page.evaluateOnNewDocument(vp => {
        Object.defineProperty(navigator, 'screen', {
          value: {
            ...navigator.screen,
            width: vp.width,
            height: vp.height,
            availWidth: vp.width,
            availHeight: vp.height,
            pixelDepth: 24,
            colorDepth: 24,
          },
          configurable: true,
          enumerable: true,
          writable: true,
        });
      }, viewport);
    }
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.screenshot({ path: path.join(screenshotsDir, '1_after_load.png') });

    if (selectors.cookieSelector) {
        try {
            await page.waitForSelector(selectors.cookieSelector, { visible: true, timeout: 7000 });
            await page.click(selectors.cookieSelector);
            await page.waitForFunction((selector) => !document.querySelector(selector), { timeout: 5000 }, selectors.cookieSelector);
        } catch (e) {
            console.log("Cookie banner not found or did not disappear. Continuing...");
        }
    }
    
    const typingDelay = (antiDetect && antiDetect.randomizeTimings) ? Math.floor(Math.random() * 100 + 50) : 0;
    
    await page.type(selectors.emailSelector, email, { delay: typingDelay });
    
    try {
        await page.waitForSelector(selectors.submitSelector, { visible: true, timeout: 10000 });
        await page.$eval(selectors.submitSelector, button => button.click());
        await sleep(3000);
    } catch (error) {
        await page.screenshot({ path: path.join(screenshotsDir, 'error_on_submit.png') });
        throw new Error(`Could not find or click submit button with selector: ${selectors.submitSelector}`);
    }
    
    res.json({ success: true, message: `Successfully submitted form for ${email}.` });

  } catch (error) {
    console.error(`Auto-fill error for ${email}:`, error.message);
    res.status(500).json({ success: false, message: error.message || 'Form submission failed' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Endpoint for the IP Tester
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
    if (proxyType.startsWith('SOCKS')) {
      browserArgs.push(`--proxy-server=socks5://${proxy}`);
    } else {
      browserArgs.push(`--proxy-server=http://${proxy}`);
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
    res.status(500).json({ success: false, message: error.message });
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