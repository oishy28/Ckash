
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

function findMeter(serial) { //Desco Functionality
  try {
    if (serial.startsWith('A')) {
      const metersA = JSON.parse(fs.readFileSync(path.join(__dirname, 'companyA_meters.json')));
      return metersA.find(m => m.serial === serial);
    } else {
      const metersB = JSON.parse(fs.readFileSync(path.join(__dirname, 'companyB_meters.json')));
      return metersB.find(m => m.serial === serial);
    }
  } catch (err) {
    console.error('❌ Error in findMeter:', err);
    return null;
  }
}

function updateMeter(serial) {
  if (serial.startsWith('A')) {
    const meters = JSON.parse(fs.readFileSync(path.join(__dirname, 'companyA_meters.json')));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) {
      meters[idx].due = 0;
      fs.writeFileSync(path.join(__dirname, 'companyA_meters.json'), JSON.stringify(meters, null, 2));
    }
  } else {
    const meters = JSON.parse(fs.readFileSync(path.join(__dirname, 'companyB_meters.json')));
    const idx = meters.findIndex(m => m.serial === serial);
    if (idx !== -1) {
      meters[idx].due = 0;
      fs.writeFileSync(path.join(__dirname, 'companyB_meters.json'), JSON.stringify(meters, null, 2));
    }
  }
}

function getBankData() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'Bank.json')));
}

function updateBank(ownerId, amount) {
  const bank = getBankData();
  const idx = bank.findIndex(p => p.id === ownerId);
  if (idx !== -1) {
    bank[idx].amount -= amount;
    fs.writeFileSync(path.join(__dirname, 'Bank.json'), JSON.stringify(bank, null, 2));
  }
}

app.post('/validate-meter', (req, res) => {
  try {
    const { serial } = req.body;
    console.log(' Received serial:', serial);

    const meter = findMeter(serial);
    console.log(' Found meter:', meter);

    if (!meter) return res.status(404).json({ error: 'Meter not found' });

    res.json({ meter });
  } catch (err) {
    console.error('❌ Error in /validate-meter:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/make-payment', (req, res) => {
  try {
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

    const transactions = JSON.parse(fs.readFileSync(path.join(__dirname, 'transactions.json')));
    transactions.push(transaction);
    fs.writeFileSync(path.join(__dirname, 'transactions.json'), JSON.stringify(transactions, null, 2));

    updateMeter(serial);
    updateBank(meter.ownerId, meter.due);

    res.json({ message: 'Payment successful', transaction });
  } catch (err) {
    console.error('❌ Error in /make-payment:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
