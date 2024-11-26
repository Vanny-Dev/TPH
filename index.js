const { Client, Collection, GatewayIntentBits, IntentsBitField, ActionRowBuilder, StringSelectMenuBuilder, Partials, ButtonBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const getGPT4js = require("gpt4js");

require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
		    GatewayIntentBits.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
		    GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


// const config = require('./config.json');
const welcome = require('./welcome.js');
const goodbye = require('./goodbye.js');
require("./deploy.js");
require("./keepalive.js");

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    welcome(client);
    goodbye(client);
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

let isPaused = false;
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    if (customId === 'pause') {
        if (isPaused) {
            global.currentPlayer.unpause();
            isPaused = false;
            await interaction.update({
                content: 'The song has been resumed.',
                components: [createButtonRow()],
            });
        } else {
            global.currentPlayer.pause();
            isPaused = true;
            await interaction.update({
                content: 'The song has been paused.',
                components: [createButtonRow()],
            });
        }
    }
    else if (customId === 'stop') {
        const connection = getVoiceConnection(interaction.guildId);
        if (connection) {
            connection.destroy();
            currentPlayer = null;
            queue = [];
            await interaction.update({
                content: '🎤 Bot has disconnected from the voice channel.',
                embeds: [],
                components: [],
            });
        }
    }
    if (interaction.customId === 'skip') {
        if (currentPlayer) {
            currentPlayer.stop(); // Skip the current song
            interaction.update({ content: '⏭ Skipping to the next song...', components: [] });
        }
    }
});

// Helper function to create the button row
function createButtonRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop')
            .setStyle('Danger'), 
        new ButtonBuilder()
            .setCustomId('pause')
            .setLabel(isPaused ? 'Resume' : 'Pause')
            .setStyle(isPaused ? 'Primary' : 'Secondary'),
        new ButtonBuilder()
            .setCustomId('skip')
            .setLabel('Skip')
            .setStyle('Primary') 
    );
}


client.login(process.env.TOKEN);
