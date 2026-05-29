const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'research', 'Metsamaterjali_hinnastatistika_04_2026.xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'lib', 'valuation', 'official_prices.json');

function parseExcel() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  // Võtame alati kõige viimase aasta lehe (nt '2026')
  const sheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
  console.log(`Loen lehte: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const prices = {};
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 2) continue;
    
    const name = row[0];
    if (typeof name === 'string') {
      const lowerName = name.toLowerCase().trim();
      
      // Tahame saada kõiki puitu puudutavaid ridu
      if (
        lowerName.includes('palk') || 
        lowerName.includes('paberipuit') || 
        lowerName.includes('küttepuit') || 
        lowerName.includes('pakk') || 
        lowerName.includes('hakkpuit') ||
        lowerName.includes('latt')
      ) {
        let price = 0;
        // Otsime reast tagantpoolt esimest numbrit (kõige värskem saadaolev kuu/aasta keskmine)
        for (let j = row.length - 1; j > 0; j--) {
          if (typeof row[j] === 'number' && row[j] > 0) {
            price = row[j];
            break;
          }
        }
        
        if (price > 0) {
          prices[lowerName] = price;
        }
      }
    }
  }

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(prices, null, 2));
  console.log(`Puhastatud hinnad salvestatud: ${OUTPUT_PATH}`);
}

parseExcel();
