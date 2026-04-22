import express from 'express';
import cors from 'cors';
import { initDB } from './db/schema.js';
import globalParamsRouter from './routes/globalParams.js';
import leverConfigsRouter from './routes/leverConfigs.js';
import storesRouter from './routes/stores.js';
import presetsRouter from './routes/presets.js';
import simulationsRouter from './routes/simulations.js';
import leversRouter from './routes/levers.js';
import historyRouter from './routes/history.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '15mb' }));

// Initialize DB (synchronous with better-sqlite3)
initDB();

// Routes
app.use('/api/global-params', globalParamsRouter);
app.use('/api/lever-configs', leverConfigsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/presets', presetsRouter);
app.use('/api/simulations', simulationsRouter);
app.use('/api/hypotheses', leversRouter);
app.use('/api/history', historyRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
