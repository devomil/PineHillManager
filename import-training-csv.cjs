const fs = require('fs');

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  
  for (let line of lines) {
    if (!line.trim()) continue;
    
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

// Read and parse CSV
const csvText = fs.readFileSync('attached_assets/Product Training test 2.0_1760719689510.csv', 'utf8');
const rows = parseCSV(csvText);

// Convert to objects
const headers = rows[0];
const products = rows.slice(1).map(row => {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx] || '';
  });
  return obj;
});

// Send to API (prepare JSON for manual import)
const productsForImport = products.filter(p => p.Item === 'Product' || p.Item === 'Image');

console.log('Total rows:', productsForImport.length);
console.log('Products:', productsForImport.filter(p => p.Item === 'Product').length);
console.log('\nSample product:', JSON.stringify(productsForImport[0], null, 2));

// Save to file for API import
fs.writeFileSync('training-import-data.json', JSON.stringify(productsForImport, null, 2));
console.log('\nSaved to training-import-data.json');
