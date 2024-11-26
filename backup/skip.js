const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the currently playing song.'),

    async execute(interaction) {
        try {
            // Check if there is an active player
            if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
                return interaction.reply('There is no song currently playing to skip.');
            }

            // Stop the current song (this will trigger the player to move to the next song in the queue)
            global.currentPlayer.stop(true); // Force stop the player
            console.log('Song skipped.');

            // Send a confirmation reply
            return interaction.reply('The current song has been skipped.');
        } catch (error) {
            console.error('Error while skipping the song:', error);
            return interaction.reply('There was an error skipping the song.');
        }
    }
};
