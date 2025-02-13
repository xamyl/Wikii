const fs = require('fs-extra');
const { marked } = require('marked');
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

marked.use({ renderer });

const buildWiki = async () => {
  try {
    const files = await fs.readdir(inputDir);
    await fs.ensureDir(outputDir);

    const promises = files.map(async (file) => {
      const filePath = path.join(inputDir, file);
      if (filePath.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf8');
        const htmlContent = marked(content);  
        const htmlFilePath = path.join(outputDir, `${path.basename(file, '.md')}.html`);
        await fs.writeFile(htmlFilePath, htmlContent);
      }
    });

    await Promise.all(promises);
    console.log('Wiki pages generated!');
  } catch (err) {
    console.error('Error generating wiki:', err);
  }
};

buildWiki();
