const fs = require('fs-extra');
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
    return `<a href="${href}">${text}</a>`;
  }
  return `<a href="#">${text} (invalid link)</a>`;
};

renderer.code = function (code, language) {
  const highlighted = hljs.highlightAuto(code).value;
  return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`;
};

marked.setOptions({
  renderer: renderer,
  highlight: (code, lang) => hljs.highlightAuto(code).value,
});

const buildWiki = async () => {
  try {
    const files = await fs.readdir(inputDir);
    await fs.ensureDir(outputDir);

    await fs.copy(path.join(__dirname, 'global.css'), path.join(outputDir, 'global.css'));

    const promises = files.map(async (file) => {
      const filePath = path.join(inputDir, file);
      if (filePath.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf8');
        const htmlContent = marked.parse(content);

        const title = path.basename(file, '.md').replace(/^./, (str) => str.toUpperCase());
        const htmlFilePath = path.join(outputDir, `${path.basename(file, '.md')}.html`);
        
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="global.css">
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`;

        await fs.writeFile(htmlFilePath, fullHtml);
      }
    });

    await Promise.all(promises);
    console.log('Wiki pages generated!');
  } catch (err) {
    console.error('Error generating wiki:', err);
  }
};

buildWiki();
