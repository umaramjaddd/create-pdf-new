const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Dynamic imports based on environment
let puppeteer;
let chromium;

if (process.env.VERCEL) {
  // For Vercel deployment
  chromium = require('@sparticuz/chromium-min');
  puppeteer = require('puppeteer-core');
} else {
  // For local development
  puppeteer = require('puppeteer');
}

app.use(express.json());

app.post('/generate-pdf', async (req, res) => {
  const { url, filename = 'document.pdf' } = req.body;

  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  let browser;
  try {
    const launchOptions = process.env.VERCEL ? {
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    } : {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    console.log('Launching browser with options:', launchOptions);
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Browser close error:', e));
    }
  }
});

app.get('/', (req, res) => {
  res.send("PDF Generator API is running. Send a POST request to /generate-pdf with a URL to generate a PDF.");
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;