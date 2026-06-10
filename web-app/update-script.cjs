const fs = require('fs');

const filePath = 'C:/projetos_dev/CONCURSO CAMARA/web-app/src/components/RewardShop.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all 350 with 150
content = content.replace(/350/g, '150');

// Replace the AI Sticker generation logic
const oldAiLogic = `      const success = await spendPoints(500, \`gerar_sticker_ia_aleatorio\`);
      if (success) {
        const img = await loadImageElement(aiUrl);
        const blob = await processImageBlob(img);
        
        const storageRef = ref(storage, \`users/\${user.uid}/stickers/ai_sticker_\${Date.now()}.png\`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        
        await addStickerToInventory(\`ai_\${Date.now()}\`, downloadUrl);
        setActiveTab('inventory');
      }`;

const newAiLogic = `      const success = await spendPoints(500, \`gerar_sticker_ia_aleatorio_pack\`);
      if (success) {
        const generatedItems: {id: string, url: string}[] = [];
        
        for (let i = 0; i < 3; i++) {
          const randomTheme = themes[Math.floor(Math.random() * themes.length)];
          const prompt = \`A colorful cute sticker of \${randomTheme}, die-cut, white border, vector art style, flat colors, white background\`;
          const seed = Math.floor(Math.random() * 1000000);
          const aiUrl = \`https://image.pollinations.ai/prompt/\${encodeURIComponent(prompt)}?seed=\${seed}&width=256&height=256&nologo=true\`;

          const img = await loadImageElement(aiUrl);
          const blob = await processImageBlob(img);
          
          const storageRef = ref(storage, \`users/\${user.uid}/stickers/ai_sticker_\${Date.now()}_\${i}.png\`);
          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);
          
          generatedItems.push({ id: \`ai_\${Date.now()}_\${i}\`, url: downloadUrl });
        }
        
        await addMultipleStickersToInventory(generatedItems);
        setActiveTab('inventory');
      }`;

content = content.replace(oldAiLogic, newAiLogic);

// Replace AI sticker description
const oldDesc = 'Gere uma figurinha aleatória única usando Inteligência Artificial. Ela será 100% sua e guardada na sua conta!';
const newDesc = 'Gere um pacote surpresa com 3 figurinhas aleatórias únicas usando Inteligência Artificial. Elas serão 100% suas e guardadas na sua conta!';
content = content.replace(oldDesc, newDesc);

// Add discount text
const oldPackView = `                <div>
                  <h3 className="font-bold text-purple-900 text-lg">Levar Pacote Completo</h3>
                  <p className="text-purple-700 text-sm">Compre todas as figurinhas de uma vez com um preço promocional especial!</p>
                </div>`;

const newPackView = `                <div>
                  <h3 className="font-bold text-purple-900 text-lg">Levar Pacote Completo</h3>
                  <p className="text-purple-700 text-sm">Compre todas as figurinhas de uma vez com um preço promocional especial!</p>
                  {viewingPack.items && viewingPack.items.length * 150 > viewingPack.price && (
                    <p className="text-green-600 text-sm font-bold mt-1">
                      Economize {(viewingPack.items.length * 150) - viewingPack.price} EP em relação à compra individual!
                    </p>
                  )}
                </div>`;

content = content.replace(oldPackView, newPackView);

// Also change adminPackPrice default from 300 to 100
content = content.replace('useState(300)', 'useState(100)');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
