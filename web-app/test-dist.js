import puppeteer from 'puppeteer';
import http from 'http';
import handler from 'serve-handler';

const server = http.createServer((request, response) => {
  return handler(request, response, { public: 'dist' });
});

server.listen(5000, async () => {
  console.log('Server running at http://localhost:5000');
  
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText));
  
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
  
  await browser.close();
  server.close();
});
