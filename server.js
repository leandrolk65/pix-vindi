// -------------------- IMPORTAÇÕES --------------------
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

// -------------------- CONSTANTES ---------------------
/*  Para produção, depois de tudo funcionar,
    troque a URL abaixo para:
    https://api.yapay.com.br/api/v3/transactions/payment
*/
const VINDI_URL =
  'https://api.sandbox.yapay.com.br/api/v3/transactions/payment';

// -------------------- APP & MIDDLEWARES --------------
const app = express();
app.use(express.json());

// Permite chamadas apenas do seu domínio
app.use((_, res, next) => {
  res.set(
    'Access-Control-Allow-Origin',
    'https://www.sualoja.com.br' // TROQUE para o seu domínio real
  );
  next();
});

// -------------------- ROTA /create-pix ---------------
app.post('/create-pix', async (req, res) => {
  const { amount, order_id = Date.now() } = req.body || {};

  // Validação básica
  if (!amount) {
    return res.status(400).json({ error: 'amount não enviado' });
  }

  const payload = {
    token_account: process.env.VINDI_TOKEN,
    transaction: {
      payment_method_id: 31, // Pix QR dinâmico
      order_number: String(order_id),
      amount,
      url_notification: process.env.NOTIFY_URL
    },
    customer: { name: 'Cliente LI' },
    transaction_product: [
      {
        description: `Pedido #${order_id}`,
        quantity: 1,
        price_unit: amount
      }
    ]
  };

  try {
    const r = await fetch(VINDI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
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
// ---------- FIM DA ROTA ----------

// -------------------- WEBHOOK OPCIONAL ----------------
app.post('/api/vindi-webhook', (req, res) => {
  console.log('Webhook:', req.body);
  // Aqui você pode atualizar o pedido na Loja Integrada via API
  res.sendStatus(200);
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pix API pronta na porta ${PORT}`));
