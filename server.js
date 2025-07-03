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
import { v4 as uuidv4 } from 'uuid';

puppeteer.use(StealthPlugin());

const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)){
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

const sessionsDir = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const FINGERPRINT_PROFILES = [
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        platform: 'Win32',
        hardwareConcurrency: [8, 12, 16],
        deviceMemory: [8, 16],
        plugins: [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ],
        fonts: ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Georgia', 'Garamond', 'Courier New', 'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia', 'Corbel', 'Segoe UI']
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        hardwareConcurrency: [8, 10, 12],
        deviceMemory: [8, 16, 32],
        plugins: [
            { name: 'QuickTime Plug-in', filename: 'QuickTime Plugin.plugin', description: 'QuickTime Plug-in 7.7.3' },
            { name: 'Google Earth Plug-in', filename: 'Google Earth Web Player.plugin', description: 'GE Plugin' },
            { name: 'Default Browser Helper', filename: 'Default Browser Helper.plugin', description: 'Default Browser Helper' }
        ],
        fonts: ['Helvetica', 'Arial', 'Geneva', 'Verdana', 'Times', 'Times New Roman', 'Courier', 'Monaco', 'Lucida Grande', 'Baskerville', 'Didot', 'Gill Sans', 'Futura']
    },
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
        platform: 'Win32',
        hardwareConcurrency: [4, 6, 8],
        deviceMemory: [4, 8],
        plugins: [
            { name: 'OpenH264 Video Codec provided by Cisco Systems, Inc.', filename: 'gmpopenh264.dll', description: 'H.264 video codec' },
            { name: 'Widevine Content Decryption Module provided by Google Inc.', filename: 'gmpxxx.dll', description: 'Widevine CDM' },
            { name: 'Shockwave Flash', filename: 'NPSWF32.dll', description: 'Shockwave Flash 32.0 r0' },
            { name: 'Java Plug-in 2 for NPAPI Browsers', filename: 'npjp2.dll', description: 'Java Platform SE 8' }
        ],
        fonts: ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Georgia', 'Garamond', 'Courier New', 'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia', 'Corbel', 'Segoe UI']
    },
    {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        hardwareConcurrency: [4, 8, 16],
        deviceMemory: [8, 16],
        plugins: [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'VLC Web Plugin', filename: 'libvlcplugin.so', description: 'VLC media player Web Plugin' },
            { name: 'Totem Web Browser Plugin', filename: 'libtotem-video-thumbnailer.so', description: 'Totem video thumbnailer plugin' },
            { name: 'Adobe Acrobat', filename: 'nppdf.so', description: 'Adobe® Acrobat® Plug-in for Web Browsers' },
            { name: 'DivX Web Player', filename: 'libtotem-video-thumbnailer.so', description: 'DivX Web Player' }
        ],
        fonts: ['DejaVu Sans', 'Liberation Sans', 'Ubuntu', 'Cantarell', 'Droid Sans', 'Roboto', 'Noto Sans']
    },
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
        platform: 'Win32',
        hardwareConcurrency: [8, 12],
        deviceMemory: [16, 32],
        plugins: [
            { name: 'Microsoft Office', filename: 'NPApi.dll', description: 'Office Presentation Plugin' },
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        ],
        fonts: ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Georgia', 'Garamond', 'Courier New', 'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia', 'Corbel', 'Segoe UI']
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        platform: 'MacIntel',
        hardwareConcurrency: [8, 10],
        deviceMemory: [8, 16],
        plugins: [
            { name: 'QuickTime Plug-in', filename: 'QuickTime Plugin.plugin', description: 'QuickTime Plug-in 7.7.3' },
        ],
        fonts: ['Helvetica', 'Arial', 'Geneva', 'Verdana', 'Times', 'Times New Roman', 'Courier', 'Monaco', 'Lucida Grande', 'Baskerville', 'Didot', 'Gill Sans', 'Futura']
    }
];

const COMMON_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

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
            // THE FINAL FIX IS HERE. I added 'timezone' back to the API call.
            const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,timezone`);
            if (geoResponse.data.status === 'success') {
                finalGeoData = {
                    location: geoResponse.data.countryCode || 'Unknown',
                    city: geoResponse.data.city,
                    country: geoResponse.data.country,
                    isp: geoResponse.data.as,
                    timezone: geoResponse.data.timezone,
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
  const { email, targetUrl, proxy, selectors, antiDetect, successKeyword, sessionData, screen, timezone } = req.body;

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
    
    if (antiDetect) {
        if (antiDetect.disableWebRTC) {
            browserArgs.push('--disable-features=WebRtcHideLocalIpsWithMdns');
        }
    }

    const sessionPath = (antiDetect?.persistentSession && sessionData?.id)
        ? path.join(sessionsDir, sessionData.id)
        : undefined;

    browser = await puppeteer.launch({
      headless: !(antiDetect && antiDetect.showBrowser),
      args: browserArgs,
      userDataDir: sessionPath
    });

    const page = await browser.newPage();
    
    if (antiDetect?.spoofTimezone && timezone) {
        try {
            await page.emulateTimezone(timezone);
            console.log(`[DEBUG] Timezone spoofed to: ${timezone}`);
        } catch (e) {
            console.warn(`Could not set timezone: ${e.message}`);
        }
    }

    if (antiDetect && antiDetect.disguiseFingerprint) {
      const profile = FINGERPRINT_PROFILES[Math.floor(Math.random() * FINGERPRINT_PROFILES.length)];
      await page.setUserAgent(profile.userAgent);
      
      const randomConcurrency = profile.hardwareConcurrency[Math.floor(Math.random() * profile.hardwareConcurrency.length)];
      const randomMemory = profile.deviceMemory[Math.floor(Math.random() * profile.deviceMemory.length)];

      await page.evaluateOnNewDocument((p) => {
          Object.defineProperty(navigator, 'platform', { get: () => p.platform });
          Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.concurrency });
          Object.defineProperty(navigator, 'deviceMemory', { get: () => p.memory });
          Object.defineProperty(navigator, 'plugins', { get: () => p.plugins });
          
          const originalFontCheck = document.fonts.check;
          document.fonts.check = function(font) {
              return p.fonts.some(f => font.toLowerCase().includes(f.toLowerCase()));
          };

      }, { 
          platform: profile.platform, 
          concurrency: randomConcurrency, 
          memory: randomMemory,
          plugins: profile.plugins,
          fonts: profile.fonts.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 10)
      });

      const viewport = screen ? { width: screen.width, height: screen.height } : COMMON_VIEWPORTS[Math.floor(Math.random() * COMMON_VIEWPORTS.length)];

      const client = await page.target().createCDPSession();
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
        platform: profile.platform,
      });
    }

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    if (selectors.cookieSelector) {
        try {
            await page.waitForSelector(selectors.cookieSelector, { visible: true, timeout: 7000 });
            await page.click(selectors.cookieSelector);
            await page.waitForFunction((selector) => !document.querySelector(selector), { timeout: 5000 }, selectors.cookieSelector);
        } catch (e) {
            console.log("Cookie banner not found or did not disappear. Continuing...");
        }
    }

    const typingDelay = (antiDetect && antiDetect.randomizeTimings) ? Math.floor(Math.random() * (150 - 50 + 1) + 50) : 0;

    await page.type(selectors.emailSelector, email, { delay: typingDelay });

    try {
        await page.waitForSelector(selectors.submitSelector, { visible: true, timeout: 10000 });
        
        if (antiDetect?.simulateMouse) {
            await page.hover(selectors.submitSelector);
            await sleep(Math.random() * 200 + 100);
        }
        
        await page.$eval(selectors.submitSelector, button => button.click());
        await sleep(3000);
    } catch (error) {
        await page.screenshot({ path: path.join(screenshotsDir, 'error_on_submit.png') });
        throw new Error(`Could not find or click submit button with selector: ${selectors.submitSelector}`);
    }

    let successMessage = `Successfully submitted form for ${email}.`;
    let sourceContent = null;

    if (successKeyword) {
      const pageContent = await page.content();
      const keywordFoundInPage = pageContent.includes(successKeyword);

      if (!keywordFoundInPage) {
        throw new Error(`Failure: Keyword "${successKeyword}" not found in page content.`);
      }

      successMessage += ` Validation: Found keyword "${successKeyword}".`;
      sourceContent = pageContent;
    } else {
        successMessage += ` Validation: Automation script completed.`;
    }
    
    let newSessionData = null;
    if (antiDetect?.persistentSession) {
        newSessionData = sessionData || { id: uuidv4() };
        newSessionData.cookies = await page.cookies(); 
    }

    res.json({
      success: true,
      message: successMessage,
      sourceContent: sourceContent,
      sessionData: newSessionData
    });

  } catch (error) {
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
        sourceContent: errorSourceContent
    });
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