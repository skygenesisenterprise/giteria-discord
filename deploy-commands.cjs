// deploy-commands.cjs
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("❌ BOT_TOKEN ou CLIENT_ID est manquant dans le fichier .env");
  process.exit(1);
}

const commands = [];

const commandsPath = path.join(__dirname, 'commands');

// Lecture récursive (avec ou sans sous-dossiers)
const walk = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.cjs')) {
      const command = require(fullPath);
      if (command.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
        console.log(`✅ Chargé : ${command.data.name}`);
      } else {
        console.warn(`⚠️ Skipped (non valide) : ${file}`);
      }
    }
  }
};

walk(commandsPath);

// Initialiser REST
const rest = new REST({ version: '9' }).setToken(token);

// Déploiement global
(async () => {
  try {
    console.log(`🚀 Déploiement de ${commands.length} commande(s) globales...`);

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Commandes slash déployées avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement :', error);
  }
})();