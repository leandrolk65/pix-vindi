// -------------------- IMPORTAÇÕES --------------------
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

// -------------------- ENDPOINT DA VINDI ----------------
// Sandbox (homologação). Para produção, troque a URL:
const VINDI_URL =
  'https://api.intermediador.sandbox.yapay.com.br/api/v3/transactions/payment';

// -------------------- APP & MIDDLEWARES --------------
const app = express();
app.use(express.json());

// Permitir chamadas apenas do domínio da sua loja
app.use((_, res, next) => {
  res.set(
    'Access-Control-Allow-Origin',
    'https://www.vivezza.com.br' // 🔄 TROQUE pelo domínio real da sua loja
  );
  next();
});

// -------------------- ROTA /create-pix ---------------
app.post('/create-pix', async (req, res) => {
  const { amount, order_id = Date.now() } = req.body || {};

  // Validação de entrada
  if (!amount) {
    return res.status(400).json({ error: 'amount não enviado' });
  }

  const payload = {
    token_account: process.env.VINDI_TOKEN, // defina no Render
    transaction: {
      payment_method_id: 31,               // Pix QR dinâmico
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
    const response = await fetch(VINDI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data?.data?.pix) throw new Error('Vindi não retornou pix');

    // Retorna código Copia‑e‑Cola + QR Base64
    res.json({
      brcode: data.data.pix.qr_code_data,
      qrCode: data.data.pix.qr_code_base64
    });
  } catch (err) {
    console.error(err);
    res
      .status(502)
      .json({ error: 'Falha ao gerar Pix', detail: err.message });
  }
});
// ---------- FIM DA ROTA ----------

// -------------------- WEBHOOK OPCIONAL ----------------
app.post('/api/vindi-webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  // TODO: atualizar pedido na Loja Integrada via API se status === 'paid'
  res.sendStatus(200);
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pix API pronta na porta ${PORT}`));
