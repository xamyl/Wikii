#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const exec = require('child_process').execSync;

const setupWiki = async () => {
  const currentDir = process.cwd();
  const projectName = path.basename(currentDir);

  const { wikiName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'wikiName',
      message: 'What would you like to name your wiki project?',
      default: projectName,
    },
  ]);

  const wikiDir = path.join(currentDir, wikiName);
  
  try {
    console.log('Setting up your wiki project...');
    await fs.ensureDir(path.join(wikiDir, 'docs'));
    await fs.ensureDir(path.join(wikiDir, 'dist'));
    
    const readmeContent = `# ${wikiName}\n\nWelcome to your wiki project! You can start editing your wiki in the \`docs/\` folder.`;
    await fs.writeFile(path.join(wikiDir, 'docs', 'index.md'), readmeContent);

    const buildJs = `const fs = require('fs-extra');
const marked = require('marked');
const path = require('path');
const hljs = require('highlight.js');

const inputDir = './docs';
const outputDir = './dist';

marked.use({
  mangle: false,
  headerIds: false,
  headerPrefix: '',
});

const renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
  const filePath = path.join(inputDir, href);
  const linkExists = fs.existsSync(filePath);
  if (linkExists) {
    return \`<a href="\${href}">\${text}</a>\`;
  }
  return \`<a href="#">\${text} (invalid link)</a>\`;
};

renderer.code = function (code, language) {
  const highlighted = hljs.highlightAuto(code).value;
  return \`<pre><code class="hljs \${language}">\${highlighted}</code></pre>\`;
};

marked.setOptions({
  renderer: renderer,
  highlight: (code, lang) => hljs.highlightAuto(code).value,
});

const buildWiki = async () => {
  try {
    const files = await fs.readdir(inputDir);
    await fs.ensureDir(outputDir);
    
    const promises = files.map(async (file) => {
      const filePath = path.join(inputDir, file);
      if (filePath.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf8');
        const htmlContent = marked(content);

        const title = path.basename(file, '.md').replace(/^./, (str) => str.toUpperCase());
        const htmlFilePath = path.join(outputDir, \`\${path.basename(file, '.md')}.html\`);
        
        const fullHtml = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${title}</title>
  <link rel="stylesheet" href="../global.css">
</head>
<body>
  <h1>\${title}</h1>
  \${htmlContent}
</body>
</html>\`;

        await fs.writeFile(htmlFilePath, fullHtml);
      }
    });

    await Promise.all(promises);
    console.log('Wiki pages generated!');
  } catch (err) {
    console.error('Error generating wiki:', err);
  }
};

buildWiki();`;

    await fs.writeFile(path.join(wikiDir, 'build.js'), buildJs);

    const searchJs = `const lunr = require('lunr');
const fs = require('fs-extra');
const path = require('path');

const outputDir = './dist';
const indexFilePath = './dist/search_index.json';

const buildSearchIndex = async () => {
  const searchIndex = lunr(function () {
    this.field('title');
    this.field('content');
    this.ref('id');
  });

  try {
    const files = await fs.readdir(outputDir);
    const wikiPages = [];

    for (const file of files) {
      if (file.endsWith('.html')) {
        const filePath = path.join(outputDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const title = path.basename(file, '.html');
        const id = wikiPages.length + 1;
        searchIndex.add({
          id: id.toString(),
          title: title,
          content: content,
        });
        wikiPages.push({ id: id.toString(), title: title, content: content });
      }
    }

    await fs.writeJson(indexFilePath, searchIndex.toJSON());
    console.log('Search index created!');
  } catch (err) {
    console.error('Error creating search index:', err);
  }
};

buildSearchIndex();`;

    await fs.writeFile(path.join(wikiDir, 'search.js'), searchJs);

    const serverJs = `const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const port = 3000;
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
  console.log(\`Server running at http://localhost:\${port}\`);
});`;

    await fs.writeFile(path.join(wikiDir, 'server.js'), serverJs);

    const packageJson = {
      name: wikiName.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
      version: '1.0.0',
      description: `${wikiName} - A Node.js wiki generator for GitHub Pages with built-in search`,
      scripts: {
        build: 'node build.js',
        start: 'node server.js',
      },
      dependencies: {
        marked: '^5.0.0',
        'fs-extra': '^11.0.0',
        express: '^4.18.2',
        lunr: '^2.3.9',
        'highlight.js': '^11.7.0',
      },
      devDependencies: {
        nodemon: '^2.0.20',
      },
    };

    await fs.writeJson(path.join(wikiDir, 'package.json'), packageJson);

    console.log('Installing dependencies...');
    exec('npm install', { cwd: wikiDir });

    await fs.copy(path.join(__dirname, 'global.css'), path.join(wikiDir, 'global.css'));

    console.log('Wiki project setup complete!');
    console.log(`To start your wiki, run the following commands:`);
    console.log(`cd ${wikiDir}`);
    console.log('npm run build');
    console.log('npm start');
  } catch (error) {
    console.error('Error setting up the wiki project:', error);
  }
};

setupWiki();
