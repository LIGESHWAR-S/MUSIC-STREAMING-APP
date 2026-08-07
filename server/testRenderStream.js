import https from 'https';

console.log('Querying production Render backend stream endpoint...');
https.get('https://music-streaming-app-xg03.onrender.com/api/tracks/stream/2ogKpj5QuSY', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  
  let size = 0;
  res.on('data', chunk => {
    size += chunk.length;
    if (size > 200000) {
      console.log(`🎉 SUCCESS: Stream data received: ${size} bytes!`);
      process.exit(0);
    }
  });
  
  res.on('end', () => {
    console.log(`Stream ended. Total size: ${size} bytes`);
    if (size < 100000) {
      console.log('❌ FAILED: Stream ended early!');
      process.exit(1);
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
