// -------------------- IMPORTAÇÕES --------------------
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

// -------------------- APP & MIDDLEWARES --------------
const app = express();
app.use(express.json());

// Apenas a sua loja pode chamar
app.use((_, res, next) => {
  res.set('Access-Control-Allow-Origin', 'https://www.sualoja.com.br'); // TROQUE pelo seu domínio real
  next();
});

// -------------------- ROTA /create-pix ---------------
app.post('/create-pix', async (req, res) => {
  const { amount, order_id = Date.now() } = req.body || {};

  if (!amount) {
    return res.status(400).json({ error: 'amount não enviado' });
  }

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

  try {
    const r = await fetch(
      'https://api.yapay.com.br/api/v3/transactions/payment',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const j = await r.json();
    if (!j?.data?.pix) throw new Error('Vindi não retornou pix');

    res.json({
      brcode: j.data.pix.qr_code_data,
      qrCode: j.data.pix.qr_code_base64
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Falha ao gerar Pix', detail: err.message });
  }
});

// -------------------- WEBHOOK OPCIONAL ----------------
app.post('/api/vindi-webhook', (req, res) => {
  console.log('Webhook:', req.body);
  res.sendStatus(200);
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pix API pronta na porta ${PORT}`));
