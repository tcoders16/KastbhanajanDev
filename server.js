import express from 'express';
import cors from 'cors';
import routes from './routes/endpoint.js'; // Make sure this path is correct

const app = express();

// ✅ Middleware setup
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use('/', routes);

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Ramayan search server running on http://localhost:${PORT}`);
});