const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 🔍 Find meter by serial
function findMeter(serial) {
  if (serial.startsWith('A')) {
    const metersA = JSON.parse(fs.readFileSync('./companyA_meters.json'));
    return metersA.find(m => m.serial === serial);
  } else {
    const metersB = JSON.parse(fs.readFileSync('./companyB_meters.json'));
    return metersB.find(m => m.serial === serial);
  }
}

// 💾 Update meter due to 0
function updateMeter(serial) {
  if (serial.startsWith('A')) {
    const meters = JSON.parse(fs.readFileSync('./companyA_meters.json'));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) {
      meters[idx].due = 0;
      fs.writeFileSync('./companyA_meters.json', JSON.stringify(meters, null, 2));
    }
  } else {
    const meters = JSON.parse(fs.readFileSync('./companyB_meters.json'));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) {
      meters[idx].due = 0;
      fs.writeFileSync('./companyB_meters.json', JSON.stringify(meters, null, 2));
    }
  }
}

// 💳 Get and update Bank
function getBankData() {
  return JSON.parse(fs.readFileSync('./Bank.json'));
}

function updateBank(ownerId, amount) {
  const bank = getBankData();
  const idx = bank.findIndex(p => p.id === ownerId);
  if (idx !== -1) {
    bank[idx].amount -= amount;
    fs.writeFileSync('./Bank.json', JSON.stringify(bank, null, 2));
  }
}

// ✅ Validate meter serial
app.post('/validate-meter', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'Serial is required' });

  const meter = findMeter(serial);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });

  res.json({ meter });
});

// 💸 Process payment
app.post('/make-payment', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'Serial is required' });

  const meter = findMeter(serial);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });

  if (meter.due === 0) return res.status(400).json({ message: 'Already paid' });

  const bank = getBankData();
  const user = bank.find(b => b.id === meter.ownerId);
  if (!user) return res.status(400).json({ message: `Bank account not found for owner ID: ${meter.ownerId}` });

  if (user.amount < meter.due) {
    return res.status(400).json({ message: `Insufficient funds. Available: ${user.amount}` });
  }

  const transaction = {
    id: `TX${Date.now()}`,
    serial,
    ownerId: meter.ownerId,
    amount: meter.due,
    timestamp: new Date().toISOString(),
    status: 'Paid'
  };

  const transactions = JSON.parse(fs.readFileSync('./transactions.json'));
  transactions.push(transaction);
  fs.writeFileSync('./transactions.json', JSON.stringify(transactions, null, 2));

  updateMeter(serial);
  updateBank(meter.ownerId, meter.due);

  res.json({ message: 'Payment successful', transaction });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
