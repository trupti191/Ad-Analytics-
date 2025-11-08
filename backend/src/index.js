const express = require('express');
const cors = require('cors');
const predictionRoutes = require('./routes/predictions');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/admin', predictionRoutes.adminRouter);
app.use('/', predictionRoutes.publicRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Champhunt backend running on port ${PORT}`);
});

