const lunr = require('lunr');
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

buildSearchIndex();
