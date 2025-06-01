
import mongoose from 'mongoose';
import express from "express"
import { BillingRequest } from './models/BillingRequest.js';
import { computeDiff } from './utlis/computeDiff.js';
const app = express();
import dotenv from 'dotenv';
dotenv.config()
import towerLocationDetailsRoutes from "./routes/towerLocationRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use(express.json());
app.use('/api/', towerLocationDetailsRoutes);
app.use('/api/approval', approvalRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





