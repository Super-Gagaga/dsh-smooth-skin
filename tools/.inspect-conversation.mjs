import { openSync, readSync, closeSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const fd = openSync('C:/Users/hzh12/AppData/Local/Programs/DeepSeek Harness/resources/app.asar', 'r');
try {
  const header = Buffer.alloc(16); readSync(fd, header, 0, 16, 0);
  const json = Buffer.alloc(header.readUInt32LE(12)); readSync(fd, json, 0, json.length, 16);
  const base = 8 + header.readUInt32LE(4);
  const files = [];
  function walk(nodes, parent = '') {
    for (const [name, entry] of Object.entries(nodes)) {
      const path = parent + name;
      if (entry.files) walk(entry.files, path + '/');
      else if (/dsh-client-ui-(conversation|chat)\/lib\/client\.js$/.test(path) || /dsh-client-ui-primitives\/lib\/markdown\/MarkdownText\.module\.css$/.test(path)) files.push([path, entry]);
    }
  }
  walk(JSON.parse(json).files);
  for (const [path, entry] of files) {
    const buffer = Buffer.alloc(entry.size); readSync(fd, buffer, 0, buffer.length, base + Number(entry.offset));
    const name = path.endsWith('.css') ? 'native-markdown.css' : path.match(/(dsh-client-ui-[^/]+)\/lib/)[1] + '.txt';
    await writeFile(new URL(`.${name}`, import.meta.url), buffer);
    console.log(name, buffer.length);
  }
} finally { closeSync(fd); }
