const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Chromium options (larger for better compatibility)
chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

app.post('/generate-pdf', async (req, res) => {
  const { url, filename = 'document.pdf' } = req.body;

  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  let browser;
  try {
    const executablePath = await chromium.executablePath();
    console.log('Chromium executable path:', executablePath);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000); // Increased timeout
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

// Export for Vercel
module.exports = app;