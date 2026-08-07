import https from 'https';

https.get('https://music-streaming-app-xg03.onrender.com/api/tracks/stream/2ogKpj5QuSY', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
    process.exit(0);
  });
});
