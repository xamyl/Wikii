const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const port = 4126;
const distDir = path.join(__dirname, 'dist');

app.use(express.static(distDir));

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.send('No search query provided.');

  const indexPath = path.join(distDir, 'search_index.json');
  const indexData = await fs.readJson(indexPath);

  const results = indexData.docs.filter(doc => doc.title.includes(query) || doc.content.includes(query));
  res.json(results);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
