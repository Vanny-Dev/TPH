const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the currently playing audio.'),

    async execute(interaction) {
        // Check if the global currentPlayer exists and is playing
        if (!global.currentPlayer || global.currentPlayer.state.status !== AudioPlayerStatus.Playing) {
            return interaction.reply('There is no audio playing to pause.');
        }

        try {
            // Pause the audio player
            global.currentPlayer.pause();

            // Send confirmation reply
            return interaction.reply('Audio has been paused.');
        } catch (error) {
            console.error('Error while pausing audio:', error);
            return interaction.reply('There was an error pausing the audio.');
        }
    }
};
