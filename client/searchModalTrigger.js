import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('isAddSongModalOpen') || lines[i].includes('AddSongModal') || lines[i].includes('setIsAddSongModalOpen')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
