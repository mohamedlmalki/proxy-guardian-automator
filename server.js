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

<<<<<<< HEAD
=======
// Helper function for realistic mouse movement
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
const moveMouseLikeHuman = async (page, element) => {
    const box = await element.boundingBox();
    if (!box) {
        return;
    }
<<<<<<< HEAD
    const startX = Math.floor(Math.random() * 100) + 50;
    const startY = Math.floor(Math.random() * 100) + 50;
    await page.mouse.move(startX, startY, { steps: 5 });
    await sleep(100);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await sleep(200);
=======
    // Start from a more random position to make the movement obvious
    const startX = Math.floor(Math.random() * 100) + 50;
    const startY = Math.floor(Math.random() * 100) + 50;
    await page.mouse.move(startX, startY, { steps: 5 });
    await sleep(100); // Small pause
    // Move to the element with more steps to slow it down
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await sleep(200); // Pause on the element before the click
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
<<<<<<< HEAD
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
=======
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0'
];

const generateRandomName = () => {
    const firstNames = ['John', 'Jane', 'Alex', 'Chris', 'Pat', 'Michael', 'Sarah', 'David', 'Emily'];
    const lastNames = ['Doe', 'Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3

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
<<<<<<< HEAD
    res.status(500).json({ success: false, message: getErrorMessage(error), statusCode: error.response?.status });
=======
    const errorMessage = getErrorMessage(error);
    console.error(`Test connection for ${proxy} failed:`, errorMessage);
    res.status(500).json({
        success: false,
        message: errorMessage,
        statusCode: error.response?.status
    });
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
  }
});

// Endpoint for the Auto Filler
app.post('/api/auto-fill', async (req, res) => {
<<<<<<< HEAD
  // This line is now corrected to receive the settings from the frontend
  const { email, targetUrl, proxy, selectors, antiDetect, successKeyword, sessionData } = req.body;
  
  if (!email || !targetUrl || !selectors) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
=======
  const { email, targetUrl, proxy, selectors, successKeyword, antiDetect, sessionData } = req.body;
  console.log("Received Anti-Detect Settings:", antiDetect);

  if (!email || !targetUrl || !selectors) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: email, targetUrl, or selectors'
    });
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
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
<<<<<<< HEAD
    
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
=======

    if (antiDetect && antiDetect.persistentSession && sessionData) {
        if (sessionData.cookies) {
            await page.setCookie(...sessionData.cookies);
        }
        if (sessionData.localStorage) {
            await page.evaluate(data => {
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
            }, sessionData.localStorage);
        }
        if (sessionData.sessionStorage) {
            await page.evaluate(data => {
                for (const key in data) {
                    sessionStorage.setItem(key, data[key]);
                }
            }, sessionData.sessionStorage);
        }
    }

    if (antiDetect && antiDetect.disguiseFingerprint) {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setUserAgent(userAgent);
      await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
    } else {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
    }

    let networkResponseText = '';
    page.on('response', async (response) => {
        try {
            const text = await response.text();
            networkResponseText += text + '\n';
        } catch (e) {
            // Ignore errors
        }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    if (selectors.cookieSelector) {
        try {
            console.log(`Waiting for cookie banner button with selector: ${selectors.cookieSelector}`);
            const cookieButton = await page.waitForSelector(selectors.cookieSelector, { visible: true, timeout: 7000 });
            if (antiDetect.simulateMouse && cookieButton) {
                await moveMouseLikeHuman(page, cookieButton);
            }
            await page.click(selectors.cookieSelector);
            console.log('Successfully clicked the cookie consent button.');
            await sleep(1000);
        } catch (e) {
            console.log(`Cookie consent button with selector "${selectors.cookieSelector}" not found or not clickable. Continuing...`);
        }
    }

    if (antiDetect && antiDetect.randomizeTimings) {
        await randomSleep(1500, 3000);
    } else {
        await sleep(2000);
    }

    const typingDelay = (antiDetect && antiDetect.randomizeTimings) ? Math.floor(Math.random() * 100 + 50) : 0;

    try {
      const emailInput = await page.waitForSelector(selectors.emailSelector, { timeout: 10000 });
      if (antiDetect.simulateMouse && emailInput) {
        await moveMouseLikeHuman(page, emailInput);
      }
      await page.type(selectors.emailSelector, email, { delay: typingDelay });
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
    } catch (error) {
        await page.screenshot({ path: path.join(screenshotsDir, 'error_on_submit.png') });
        throw new Error(`Could not find or click submit button with selector: ${selectors.submitSelector}`);
    }
<<<<<<< HEAD
    
    res.json({ success: true, message: `Successfully submitted form for ${email}.` });

  } catch (error) {
    console.error(`Auto-fill error for ${email}:`, error.message);
    res.status(500).json({ success: false, message: error.message || 'Form submission failed' });
=======

    if (selectors.nameSelector) {
      try {
        const nameInput = await page.waitForSelector(selectors.nameSelector, { timeout: 5000 });
        if(antiDetect.simulateMouse && nameInput) {
            await moveMouseLikeHuman(page, nameInput);
        }
        await page.type(selectors.nameSelector, generateRandomName(), { delay: typingDelay });
      } catch (error) {
        console.log('Name field not found or not required');
      }
    }

    if (selectors.phoneSelector) {
      try {
        const phoneInput = await page.waitForSelector(selectors.phoneSelector, { timeout: 5000 });
        if(antiDetect.simulateMouse && phoneInput) {
            await moveMouseLikeHuman(page, phoneInput);
        }
        await page.type(selectors.phoneSelector, '+1234567890', { delay: typingDelay });
      } catch (error) {
        console.log('Phone field not found or not required');
      }
    }
    
    try {
        const submitButton = await page.waitForSelector(selectors.submitSelector, { visible: true, timeout: 10000 });
        if(antiDetect.simulateMouse && submitButton) {
            await moveMouseLikeHuman(page, submitButton);
        }
        await Promise.all([
            page.click(selectors.submitSelector),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => console.log('No navigation after click, continuing...'))
        ]);

    } catch(error) {
        throw new Error(`Could not find or click submit button with selector: ${selectors.submitSelector}`);
    }
    
    let successMessage = `Successfully submitted form for ${email}.`;
    let sourceContent = null;
    let newSessionData = {};

    if (antiDetect && antiDetect.persistentSession) {
        const cookies = await page.cookies();
        const localStorageData = await page.evaluate(() => {
            let json = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                json[key] = localStorage.getItem(key);
            }
            return json;
        });
        const sessionStorageData = await page.evaluate(() => {
            let json = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                json[key] = sessionStorage.getItem(key);
            }
            return json;
        });
        newSessionData = {
            cookies,
            localStorage: localStorageData,
            sessionStorage: sessionStorageData
        };
    }

    if (successKeyword) {
      const pageContent = await page.content();
      const keywordFoundInPage = pageContent.includes(successKeyword);
      const keywordFoundInNetwork = networkResponseText.includes(successKeyword);
      
      if (!keywordFoundInPage && !keywordFoundInNetwork) {
        throw new Error(`Failure: Keyword "${successKeyword}" not found in page content or network responses.`);
      }
      
      successMessage += ` Validation: Found keyword "${successKeyword}".`;
      sourceContent = keywordFoundInPage ? pageContent : networkResponseText;

    } else {
        successMessage += ` Validation: Automation script completed.`;
    }
    
    res.json({
      success: true,
      message: successMessage,
      sourceContent: sourceContent,
      email: email,
      proxy: proxy || 'Direct Connection',
      sessionData: newSessionData
    });
    
  } catch (error) {
    console.error(`Auto-fill error for ${email}:`, error.message);
    
    let errorSourceContent = null;
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
            errorSourceContent = await pages[pages.length - 1].content();
        }
      } catch (contentError) {
        console.error("Could not get page content on error:", contentError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Form submission failed',
      sourceContent: errorSourceContent,
      email: email,
      proxy: proxy || 'Direct Connection'
    });

>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
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
    const latency = Date.now() - startTime;
    
    if (!response) {
        throw new Error('No response received from the target URL.');
    }

    const responseBodyText = await response.text();
    let responseBodyJson = null;

    try {
      responseBodyJson = JSON.parse(responseBodyText);
    } catch (e) {
      console.log('Response is not valid JSON, returning as text.');
    }

    if (!response.ok()) {
        return res.status(response.status()).json({
            success: false,
            message: `Request failed with status: ${response.status()}`,
            sourceContent: responseBodyText
        });
    }

    res.json({
      success: true,
      message: `Successfully received response from your endpoint.`,
      status: response.status(),
      latency: latency,
      data: responseBodyJson,
      sourceContent: responseBodyText,
    });
  } catch (error) {
    console.error(`Custom test for ${proxy} to ${targetUrl} failed:`, error.message);
<<<<<<< HEAD
    res.status(500).json({ success: false, message: error.message });
=======
    let errorSourceContent = null;
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
            errorSourceContent = await pages[pages.length - 1].content();
        }
      } catch (contentError) {
        // Ignore if we can't get content
      }
    }
    res.status(500).json({
        success: false,
        message: error.message,
        sourceContent: errorSourceContent
    });
>>>>>>> 214b088a10c59c54173b2eb4998fbbb85e969dc3
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