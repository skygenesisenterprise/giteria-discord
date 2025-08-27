// server.js
import { Client, GatewayIntentBits, EmbedBuilder, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { startPresenceCycle } from "./utils/statusManager.js";

dotenv.config();

// Préparer __dirname avec ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation du client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildScheduledEvents,
  ],
});

client.commands = new Collection();

// 🔁 Chargement dynamique des commandes depuis /commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js") || file.endsWith(".cjs"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = await import(`file://${filePath}`);
    if (command.default?.data && typeof command.default.execute === "function") {
      client.commands.set(command.default.data.name, command.default);
      console.log(`✅ Commande chargée : ${command.default.data.name}`);
    } else {
      console.warn(`⚠️ Format invalide pour : ${file}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${file} :`, error);
  }
}

// 🚀 Bot prêt
client.once("ready", () => {
  console.log(`✅ Le bot est connecté en tant que ${client.user.tag}`);
  startPresenceCycle(client);
});

// 👋 Message automatique à l'arrivée sur un nouveau serveur
client.on("guildCreate", async (guild) => {
  try {
    const modChannel = guild.channels.cache.find(
      (ch) =>
        ch.isTextBased() &&
        ch.name.toLowerCase().includes("moderator") &&
        ch.permissionsFor(guild.members.me).has("SendMessages")
    );

    const channelToSend =
      modChannel ||
      guild.channels.cache.find(
        (ch) =>
          ch.isTextBased() && ch.permissionsFor(guild.members.me).has("SendMessages")
      );

    if (!channelToSend) {
      console.log(`❌ Aucun salon texte accessible dans ${guild.name}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("👋 Merci de m’avoir ajouté !")
      .setDescription(`Je suis prêt à modérer **${guild.name}**.`)
      .addFields(
        { name: "📘 Commandes", value: "Tape `/help` pour voir toutes mes fonctionnalités." },
        { name: "💬 Support", value: "Contacte un admin ou consulte la documentation." }
      )
      .setFooter({ text: `Serveur ID : ${guild.id}` })
      .setTimestamp();

    await channelToSend.send({ embeds: [embed] });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du message de bienvenue :", error);
  }
});

// ⚙️ Gestion des commandes slash
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Erreur dans la commande ${interaction.commandName} :`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "❌ Une erreur est survenue lors de l'exécution de cette commande." });
    } else {
      await interaction.reply({ content: "❌ Une erreur est survenue lors de l'exécution de cette commande.", ephemeral: true });
    }
  }
});

// 🔐 Connexion
client.login(process.env.BOT_TOKEN);