const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/controllers/statement.controller.ts',
  'src/controllers/checkout.controller.ts',
  'src/controllers/clearing.controller.ts'
];

console.log("=======================================");
console.log("🧹 LIMPANDO IMPORTAÇÕES DUPLICADAS");
console.log("=======================================\n");

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (file.includes('statement.controller.ts')) {
      // O statement já tem a importação correta na linha 1, por isso só apagamos a errada
      content = content.replace(/import \{ prisma \} from '\.\.\/config\/database';\n?/g, '');
    } else {
      // Nos outros, substituímos a errada pela correta
      content = content.replace(/import \{ prisma \} from '\.\.\/config\/database';.*/g, "import prisma from '../lib/prisma';");
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Curado: ${file}`);
  } else {
    console.log(`⚠️ Não encontrado: ${file}`);
  }
});

console.log("\n🚀 O Motor do Atlas está 100% purificado!");
