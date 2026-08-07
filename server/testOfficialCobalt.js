import https from 'https';

console.log('Testing official Cobalt API...');

const postData = JSON.stringify({
  url: 'https://www.youtube.com/watch?v=2ogKpj5QuSY',
  downloadMode: 'audio',
  audioFormat: 'mp3'
});

const options = {
  hostname: 'api.cobalt.tools',
  path: '/',
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://cobalt.tools',
    'Referer': 'https://cobalt.tools/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
