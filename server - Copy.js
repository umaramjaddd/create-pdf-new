const express = require('express');
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const app = express();
const port = 3000;

app.use(express.json());

app.post('/generate-pdf', async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  try {
  const browser = await puppeteer.launch({
  args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
  ignoreHTTPSErrors: true,
});
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=page.pdf',
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.get('/', (req, res)=>{
    res.send("how r u");
});

app.listen(port, () => {
  console.log(`PDF Generator API listening at http://localhost:${port}`);
});