import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");

// Serve static React/Vite build files
app.use(express.static(distPath));

// SPA fallback: return index.html for all non-static routes
app.use((req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Dashboard running on port ${port}`);
});