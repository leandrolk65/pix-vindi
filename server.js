import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Libera chamadas vindas apenas da sua loja
app.use((_, res, next) => {
  res.set('Access-Control-Allow-Origin', 'https://www.sualoja.com.br');
  next();
});

// Cria Pix dinâmico
app.post('/create-pix', async (req, res) => {
  const { amount, order_id = Date.now() } = req.body;

  const payload = {
    token_account: process.env.VINDI_TOKEN,
    transaction: {
      payment_method_id: 31,
      order_number: String(order_id),
      amount,
      url_notification: process.env.NOTIFY_URL
    },
    customer: { name: 'Cliente LI' },
    transaction_product: [{
      description: `Pedido #${order_id}`,
      quantity: 1,
      price_unit: amount
    }]
  };

  const r = await fetch('https://api.yapay.com.br/api/v3/transactions/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const j = await r.json();
  if (!j?.data?.pix) return res.status(400).json({ error: 'Falha ao gerar Pix', raw: j });

  res.json({
    brcode: j.data.pix.qr_code_data,
    qrCode: j.data.pix.qr_code_base64
  });
});

// Webhook (opcional — preencha depois)
app.post('/api/vindi-webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Pix API pronta'));
