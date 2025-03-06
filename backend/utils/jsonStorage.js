const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, '../storage');

const readJSON = (filename) => {
  const filePath = path.join(storageDir, `${filename}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJSON = (filename, data) => {
  const filePath = path.join(storageDir, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

module.exports = { readJSON, writeJSON };
