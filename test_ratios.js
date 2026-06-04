const http = require('http');

const tests = [
  { topic: 'Python Tutorial', aspectRatio: 'yt' },
  { topic: 'Instagram Square', aspectRatio: 'ig_square' },
  { topic: 'TikTok Video', aspectRatio: 'tiktok' },
  { topic: 'Ultra Wide', aspectRatio: 'ultra_wide' },
  { topic: 'Custom', aspectRatio: 'custom', customWidth: 400, customHeight: 300 },
];

let i = 0;
function run() {
  if (i >= tests.length) { console.log('\n✅ All tests done!'); return; }
  const t = tests[i++];
  const body = JSON.stringify(t);
  const req = http.request('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 60000
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      const dims = j.dimensions ? `${j.dimensions.width}x${j.dimensions.height}` : 'N/A';
      console.log(`${t.aspectRatio}: ${res.statusCode} | ${j.error || 'OK'} | ${dims} | ${j.imageUrl ? Math.round(j.imageUrl.length/1024)+'KB' : 'NO IMG'}`);
      run();
    });
  });
  req.write(body);
  req.end();
  req.on('error', e => { console.log(`${t.aspectRatio}: ERROR ${e.message}`); run(); });
}
run();