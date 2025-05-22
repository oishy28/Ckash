const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const COMPANY_A_FILE = './companyA_meters.json';
const COMPANY_B_FILE = './companyB_meters.json';
const TRANSACTION_FILE = './transactions.json';


// 🔍 Utility: Find meter
function findMeter(serial) {
  if (serial.startsWith('A')) {
    const metersA = JSON.parse(fs.readFileSync(COMPANY_A_FILE));
    return metersA.find(m => m.serial === serial);
  } else {
    const metersB = JSON.parse(fs.readFileSync(COMPANY_B_FILE));
    return metersB.find(m => m.serial === serial);
  }
}

// 🚫 Update due after payment
function updateMeter(serial) {
  if (serial.startsWith('A')) {
    const meters = JSON.parse(fs.readFileSync(COMPANY_A_FILE));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) meters[idx].due = 0;
    fs.writeFileSync(COMPANY_A_FILE, JSON.stringify(meters, null, 2));
  } else {
    const meters = JSON.parse(fs.readFileSync(COMPANY_B_FILE));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) meters[idx].due = 0;
    fs.writeFileSync(COMPANY_B_FILE, JSON.stringify(meters, null, 2));
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Serve static files from frontend folder (if you add CSS/JS later)
app.use(express.static(path.join(__dirname, '..', 'frontend')));



// ✅ Validate serial
app.post('/validate-meter', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'Serial is required' });

  const meter = findMeter(serial);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });

  res.json({ meter });
});

// 💸 Make payment
app.post('/make-payment', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'Serial is required' });

  const meter = findMeter(serial);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });
  if (meter.due === 0) return res.status(400).json({ message: 'Already paid' });

  const transaction = {
    id: `TX${Date.now()}`,
    serial,
    amount: meter.due,
    timestamp: new Date().toISOString()
  };

  const transactions = JSON.parse(fs.readFileSync(TRANSACTION_FILE));
  transactions.push(transaction);
  fs.writeFileSync(TRANSACTION_FILE, JSON.stringify(transactions, null, 2));

  updateMeter(serial);
  res.json({ message: 'Payment successful', transaction });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
