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

// --- Corrected Fingerprint Profiles ---

const DESKTOP_FINGERPRINTS = [
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: 'Win32', resolution: { width: 1920, height: 1080 } },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: 'MacIntel', resolution: { width: 1536, height: 864 } },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0', platform: 'Win32', resolution: { width: 1440, height: 900 } },
    { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', platform: 'Linux x86_64', resolution: { width: 1366, height: 768 } },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0', platform: 'Win32', resolution: { width: 2560, height: 1440 } },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15', platform: 'MacIntel', resolution: { width: 1680, height: 1050 } },
    { userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', platform: 'Win32', resolution: { width: 1280, height: 800 } }
];

const PHONE_FINGERPRINTS = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', platform: 'iPhone', resolution: { width: 390, height: 844 } }, // iPhone 13/14
    { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36', platform: 'Linux armv8l', resolution: { width: 412, height: 915 } }, // Matches modern Android
    { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', resolution: { width: 412, height: 915 } }, // Google Pixel
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', platform: 'iPhone', resolution: { width: 414, height: 896 } }, // iPhone 11/XR
    { userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.99 Mobile Safari/537.36', platform: 'Linux armv8l', resolution: { width: 360, height: 740 } }, // Samsung Galaxy S series
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_9 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Mobile/15E148 Safari/604.1', platform: 'iPhone', resolution: { width: 375, height: 667 } }  // iPhone 6/7/8
];


const ALL_PLUGINS = [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'QuickTime Plug-in', filename: 'QuickTime Plugin.plugin', description: 'QuickTime Plug-in 7.7.3' },
    { name: 'Google Earth Plug-in', filename: 'Google Earth Web Player.plugin', description: 'GE Plugin' },
    { name: 'Default Browser Helper', filename: 'Default Browser Helper.plugin', description: 'Default Browser Helper' },
    { name: 'OpenH264 Video Codec provided by Cisco Systems, Inc.', filename: 'gmpopenh264.dll', description: 'H.264 video codec' },
    { name: 'Widevine Content Decryption Module provided by Google Inc.', filename: 'gmpxxx.dll', description: 'Widevine CDM' },
    { name: 'Shockwave Flash', filename: 'NPSWF32.dll', description: 'Shockwave Flash 32.0 r0' },
    { name: 'Java Plug-in 2 for NPAPI Browsers', filename: 'npjp2.dll', description: 'Java Platform SE 8' },
    { name: 'VLC Web Plugin', filename: 'libvlcplugin.so', description: 'VLC media player Web Plugin' },
    { name: 'Totem Web Browser Plugin', filename: 'libtotem-video-thumbnailer.so', description: 'Totem video thumbnailer plugin' },
    { name: 'Adobe Acrobat', filename: 'nppdf.so', description: 'Adobe® Acrobat® Plug-in for Web Browsers' },
    { name: 'DivX Web Player', filename: 'libtotem-video-thumbnailer.so', description: 'DivX Web Player' },
    { name: 'Microsoft Office', filename: 'NPApi.dll', description: 'Office Presentation Plugin' },
];


const generateFingerprintProfiles = () => {
    const profiles = [];

    // Generate 7 Desktop Profiles from the structured data
    DESKTOP_FINGERPRINTS.forEach(baseProfile => {
        const shuffledPlugins = [...ALL_PLUGINS].sort(() => 0.5 - Math.random());
        profiles.push({
            type: 'desktop',
            ...baseProfile,
            hardwareConcurrency: [8, 12, 16][Math.floor(Math.random() * 3)],
            deviceMemory: [8, 16, 32][Math.floor(Math.random() * 3)],
            plugins: shuffledPlugins.slice(0, Math.floor(Math.random() * 4) + 3), // 3 to 6 plugins
            fonts: ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman', 'Georgia', 'Garamond', 'Courier New', 'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia', 'Corbel', 'Segoe UI'].sort(() => 0.5 - Math.random())
        });
    });

    // Generate 6 Phone Profiles from the structured data
    PHONE_FINGERPRINTS.forEach(baseProfile => {
        profiles.push({
            type: 'phone',
            ...baseProfile,
            hardwareConcurrency: [4, 6, 8][Math.floor(Math.random() * 3)],
            deviceMemory: [4, 6, 8][Math.floor(Math.random() * 3)],
            plugins: [], // No plugins for mobile
            fonts: ['-apple-system', 'BlinkMacSystemFont', 'San Francisco', 'Helvetica Neue', 'Arial', 'sans-serif'].sort(() => 0.5 - Math.random())
        });
    });

    return profiles;
};

const FINGERPRINT_PROFILES = generateFingerprintProfiles();

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

const installMouseHelper = async (page, cursorId) => {
  await page.evaluateOnNewDocument((id) => {
    const cursor = document.createElement('div');
    cursor.id = id;
    cursor.style.position = 'fixed';
    cursor.style.zIndex = '2147483647';
    cursor.style.width = '20px';
    cursor.style.height = '20px';
    cursor.style.background = 'rgba(255,0,0,0.5)';
    cursor.style.borderRadius = '50%';
    cursor.style.border = '1px solid white';
    cursor.style.pointerEvents = 'none';
    cursor.style.left = '0px';
    cursor.style.top = '0px';
    if (document.body) {
      document.body.appendChild(cursor);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(cursor);
        }
      });
    }
  }, cursorId);
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
                apiType: 'Cloudflare',
                timezone: workerData.cloudflare_data?.timezone,
                latitude: workerData.cloudflare_data?.latitude,
                longitude: workerData.cloudflare_data?.longitude
            };
        } else {
            const ipAddress = proxy.split(':')[0];
            const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,city,isp,as,timezone,lat,lon`);
            if (geoResponse.data.status === 'success') {
                finalGeoData = {
                    location: geoResponse.data.countryCode || 'Unknown',
                    city: geoResponse.data.city,
                    country: geoResponse.data.country,
                    isp: geoResponse.data.as,
                    timezone: geoResponse.data.timezone,
                    latitude: geoResponse.data.lat,
                    longitude: geoResponse.data.lon,
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
  const { email, proxy, selectors, antiDetect, successKeyword, sessionData, screen, timezone, latitude, longitude, steps } = req.body;

  console.log('\n\n--- NEW AUTO-FILL REQUEST ---');
  console.log(`[INFO] Received request to fill form for: ${email}`);
  console.log(`[INFO] Anti-detect settings:`, antiDetect);

  if (!email || !steps || steps.length === 0) {
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
    
    if (antiDetect?.disableWebRTC) {
        browserArgs.push('--disable-webrtc');
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
    
    const cursorId = `cursor-${Math.random().toString(36).substring(2, 9)}`;
    if (antiDetect?.showBrowser && antiDetect?.simulateMouse) {
      await installMouseHelper(page, cursorId);
    }
    
    // START >> FINAL, CORRECTED CANVAS SPOOFING LOGIC
    if (antiDetect?.spoofCanvas) {
        await page.evaluateOnNewDocument(() => {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

            // Define the noise function
            const addNoise = (canvas) => {
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const noise = Math.floor((Math.random() - 0.5) * 20);
                    data[i] = Math.max(0, Math.min(255, data[i] + noise));
                    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
                }
                ctx.putImageData(imageData, 0, 0);
            };

            // Override toDataURL
            HTMLCanvasElement.prototype.toDataURL = function() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.width;
                tempCanvas.height = this.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(this, 0, 0); // Copy original canvas
                addNoise(tempCanvas); // Add noise to the copy
                return originalToDataURL.apply(tempCanvas, arguments); // Return noisy copy's data URL
            };

            // Override getImageData
            CanvasRenderingContext2D.prototype.getImageData = function() {
                const imageData = originalGetImageData.apply(this, arguments);
                const data = imageData.data;
                 for (let i = 0; i < data.length; i += 4) {
                    const noise = Math.floor((Math.random() - 0.5) * 20);
                    data[i] = Math.max(0, Math.min(255, data[i] + noise));
                    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
                }
                return imageData;
            };
        });
        console.log('[SUCCESS] Corrected canvas spoofing enabled.');
    }
    // END >> FINAL, CORRECTED CANVAS SPOOFING LOGIC
    
    if (antiDetect?.spoofGeolocation && typeof latitude === 'number' && typeof longitude === 'number') {
        await page.setGeolocation({ latitude, longitude });
    }

    if (antiDetect?.spoofTimezone && timezone) {
        await page.emulateTimezone(timezone);
    }

    if (antiDetect?.disguiseFingerprint) {
      const profile = FINGERPRINT_PROFILES[Math.floor(Math.random() * FINGERPRINT_PROFILES.length)];
      await page.setUserAgent(profile.userAgent);
      
      await page.evaluateOnNewDocument((p) => {
          Object.defineProperty(navigator, 'platform', { get: () => p.platform });
          Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.hardwareConcurrency });
          Object.defineProperty(navigator, 'deviceMemory', { get: () => p.deviceMemory });
          Object.defineProperty(navigator, 'plugins', { get: () => p.plugins });
          
          const originalFontCheck = document.fonts.check;
          document.fonts.check = function(font) {
              return p.fonts.some(f => font.toLowerCase().includes(f.toLowerCase()));
          };

      }, { 
          platform: profile.platform, 
          hardwareConcurrency: profile.hardwareConcurrency, 
          deviceMemory: profile.deviceMemory,
          plugins: profile.plugins,
          fonts: profile.fonts.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 10)
      });
        
      const viewport = (profile.type === 'desktop' && screen && antiDetect.useMyScreenResolution) 
          ? { width: screen.width, height: screen.height } 
          : profile.resolution;

      const client = await page.target().createCDPSession();
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: profile.type === 'phone' ? 2 : 1,
        mobile: profile.type === 'phone',
        screenWidth: viewport.width,
        screenHeight: viewport.height,
        platform: profile.platform.includes('Win') ? 'Windows' : profile.platform.includes('Mac') ? 'macOS' : 'Linux',
      });
    }
    
    let networkResponse = null;
    page.on('response', async (response) => {
        if (response.url().includes('/log')) { // Or a more specific URL
            networkResponse = response;
        }
    });

    for (const [stepIndex, step] of steps.entries()) {
      if (step.targetUrl) {
        await page.goto(step.targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      }

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

      // This part now uses the fields from the current step
      for (const field of step.fields) {
          if (field.selector) {
              await page.type(field.selector, field.value.replace('{email}', email), { delay: typingDelay });
          }
      }
      
      // Clicks the button for the current step
      if (step.buttonSelector) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => console.log('No navigation after clicking button.')),
            page.click(step.buttonSelector)
          ]);
      }
      
      // --- NEW SMARTER WAITING LOGIC ---
      // Instead of a fixed sleep, we wait for an element from the NEXT step to appear.
      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
          // Find the first valid selector from the next step's fields or its button
          const selectorToWaitFor = 
              nextStep.fields.find(f => f.selector)?.selector || 
              nextStep.buttonSelector;

          if (selectorToWaitFor) {
              try {
                  console.log(`Step ${stepIndex + 1} complete. Waiting for selector of next step: "${selectorToWaitFor}"`);
                  await page.waitForSelector(selectorToWaitFor, { visible: true, timeout: 15000 });
                  console.log("Selector found. Proceeding to next step.");
              } catch (e) {
                  console.warn(`Could not find selector for Step ${stepIndex + 2}. The page may not have loaded as expected. Continuing after a short delay.`);
                  await sleep(2000); // Fallback sleep if selector not found
              }
          } else {
              await sleep(1000); // Fallback if next step has no selectors
          }
      }
      // --- END OF NEW LOGIC ---
    }

    if (!networkResponse || !networkResponse.ok()) {
        throw new Error('Network request to logging endpoint failed or was not detected.');
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

// START: NEW Test Endpoint
app.post('/api/test-fill', async (req, res) => {
    const { email, proxy, selectors, antiDetect, screen, timezone, latitude, longitude, steps } = req.body;
  
    console.log('\n\n--- NEW TEST-FILL REQUEST ---');
    console.log(`[INFO] Received request to TEST form for: ${email}`);
    console.log(`[INFO] Anti-detect settings:`, antiDetect);
  
    if (!email || !steps || steps.length === 0) {
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
      
      if (antiDetect?.disableWebRTC) {
          browserArgs.push('--disable-webrtc');
      }
  
      // NOTE: Persistent session is ignored for tests to ensure a clean slate.
      browser = await puppeteer.launch({
        headless: !(antiDetect && antiDetect.showBrowser),
        args: browserArgs,
      });
  
      const page = await browser.newPage();
      
      const cursorId = `cursor-${Math.random().toString(36).substring(2, 9)}`;
      if (antiDetect?.showBrowser && antiDetect?.simulateMouse) {
        await installMouseHelper(page, cursorId);
      }
      
      if (antiDetect?.spoofCanvas) {
          await page.evaluateOnNewDocument(() => {
              const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
              const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
              const addNoise = (canvas) => {
                  const ctx = canvas.getContext('2d');
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const data = imageData.data;
                  for (let i = 0; i < data.length; i += 4) {
                      const noise = Math.floor((Math.random() - 0.5) * 20);
                      data[i] = Math.max(0, Math.min(255, data[i] + noise));
                      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
                  }
                  ctx.putImageData(imageData, 0, 0);
              };
  
              HTMLCanvasElement.prototype.toDataURL = function() {
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = this.width;
                  tempCanvas.height = this.height;
                  const tempCtx = tempCanvas.getContext('2d');
                  tempCtx.drawImage(this, 0, 0);
                  addNoise(tempCanvas);
                  return originalToDataURL.apply(tempCanvas, arguments);
              };
  
              CanvasRenderingContext2D.prototype.getImageData = function() {
                  const imageData = originalGetImageData.apply(this, arguments);
                  const data = imageData.data;
                   for (let i = 0; i < data.length; i += 4) {
                      const noise = Math.floor((Math.random() - 0.5) * 20);
                      data[i] = Math.max(0, Math.min(255, data[i] + noise));
                      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
                  }
                  return imageData;
              };
          });
      }
      
      if (antiDetect?.spoofGeolocation && typeof latitude === 'number' && typeof longitude === 'number') {
          await page.setGeolocation({ latitude, longitude });
      }
  
      if (antiDetect?.spoofTimezone && timezone) {
          await page.emulateTimezone(timezone);
      }
  
      if (antiDetect?.disguiseFingerprint) {
        const profile = FINGERPRINT_PROFILES[Math.floor(Math.random() * FINGERPRINT_PROFILES.length)];
        await page.setUserAgent(profile.userAgent);
        
        await page.evaluateOnNewDocument((p) => {
            Object.defineProperty(navigator, 'platform', { get: () => p.platform });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => p.hardwareConcurrency });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => p.deviceMemory });
            Object.defineProperty(navigator, 'plugins', { get: () => p.plugins });
            
            const originalFontCheck = document.fonts.check;
            document.fonts.check = function(font) {
                return p.fonts.some(f => font.toLowerCase().includes(f.toLowerCase()));
            };
  
        }, { 
            platform: profile.platform, 
            hardwareConcurrency: profile.hardwareConcurrency, 
            deviceMemory: profile.deviceMemory,
            plugins: profile.plugins,
            fonts: profile.fonts.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 10)
        });
          
        const viewport = (profile.type === 'desktop' && screen && antiDetect.useMyScreenResolution) 
            ? { width: screen.width, height: screen.height } 
            : profile.resolution;
  
        const client = await page.target().createCDPSession();
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: profile.type === 'phone' ? 2 : 1,
          mobile: profile.type === 'phone',
          screenWidth: viewport.width,
          screenHeight: viewport.height,
          platform: profile.platform.includes('Win') ? 'Windows' : profile.platform.includes('Mac') ? 'macOS' : 'Linux',
        });
      }
  
      for (const [stepIndex, step] of steps.entries()) {
        if (step.targetUrl) {
          await page.goto(step.targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        }
  
        const typingDelay = (antiDetect && antiDetect.randomizeTimings) ? Math.floor(Math.random() * (150 - 50 + 1) + 50) : 0;
  
        for (const field of step.fields) {
          if (field.selector && field.value) {
            await page.type(field.selector, field.value.replace('{email}', email), { delay: typingDelay });
          }
        }
  
        if (step.buttonSelector) {
            await page.waitForSelector(step.buttonSelector, { visible: true, timeout: 10000 });
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => console.log('No navigation detected, page likely updated dynamically.')),
              page.click(step.buttonSelector)
            ]);
        }
        
        // --- NEW SMARTER WAITING LOGIC ---
        const nextStep = steps[stepIndex + 1];
        if (nextStep) {
            const selectorToWaitFor = 
                nextStep.fields.find(f => f.selector)?.selector || 
                nextStep.buttonSelector;

            if (selectorToWaitFor) {
                try {
                    console.log(`Step ${stepIndex + 1} complete. Waiting for selector of next step: "${selectorToWaitFor}"`);
                    await page.waitForSelector(selectorToWaitFor, { visible: true, timeout: 15000 });
                    console.log("Selector found. Proceeding to next step.");
                } catch (e) {
                    console.warn(`Could not find selector for Step ${stepIndex + 2}. The page may not have loaded as expected. Continuing after a short delay.`);
                    await sleep(2000);
                }
            } else {
                await sleep(1000);
            }
        }
        // --- END OF NEW LOGIC ---
      }
  
      const sourceContent = await page.content();
  
      res.json({
        success: true,
        message: `Test submission completed. Returning server response.`,
        sourceContent: sourceContent,
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
          message: error.message || 'Test submission failed',
          sourceContent: errorSourceContent
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
});
// END: NEW Test Endpoint

// Endpoint for the IP Tester



const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy checker backend running on http://localhost:${PORT}`);
});