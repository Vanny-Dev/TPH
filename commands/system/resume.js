const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused audio.'),

    async execute(interaction) {
        // Check if the global currentPlayer exists and is paused
        if (!global.currentPlayer || global.currentPlayer.state.status !== AudioPlayerStatus.Paused) {
            return interaction.reply('There is no audio paused to resume.');
        }

        try {
            // Resume the audio player
            global.currentPlayer.unpause();

            // Send confirmation reply
            return interaction.reply('Audio has been resumed.');
        } catch (error) {
            console.error('Error while resuming audio:', error);
            return interaction.reply('There was an error resuming the audio.');
        }
    }
};
