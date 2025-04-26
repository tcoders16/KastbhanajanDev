import express from 'express';
import routes from './routes/endpoint.js'; // Correct path to endpoint.js

const app = express();
app.use(express.json());
app.use('/', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Ramayan search server running on http://localhost:${PORT}`);
});