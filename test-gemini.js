const https = require('https');

const models = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-image',
  'gemini-1.5-flash',
  'gemini-2.5-pro-exp-03-25'
];

const body = JSON.stringify({contents:[{parts:[{text:'hi'}]}]});

models.forEach(m => {
  const req = https.request({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/' + m + ':generateContent?key=test',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 10000
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(m + ': Status ' + res.statusCode));
  });
  req.write(body);
  req.end();
  req.on('error', (e) => console.log(m + ': ERROR ' + e.message));
});