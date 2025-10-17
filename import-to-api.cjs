const fs = require('fs');
const http = require('http');

// Read the parsed CSV data
const products = JSON.parse(fs.readFileSync('training-import-data.json', 'utf8'));

// Take first 10 products for testing
const testProducts = products.slice(0, 25); // Include product + image rows

console.log(`Importing ${testProducts.length} rows...`);

// Prepare request data
const postData = JSON.stringify({ products: testProducts });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/training/import/csv',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    // Note: This will only work if user is already logged in
  },
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
