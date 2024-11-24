const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and make the bot leave the voice channel.'),

    async execute(interaction) {
        // Check if there is a current audio player
        if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
            return interaction.reply('There is no audio playing to stop.');
        }

        try {
            // Stop the audio player
            global.currentPlayer.stop();
            console.log('Audio has been stopped.');

            // Destroy the connection to the voice channel
            const connection = getVoiceConnection(interaction.guild.id);
            if (connection) {
                connection.destroy();
                console.log('Bot has left the voice channel.');
            } else {
                console.log('No active voice connection found.');
            }

            // Send confirmation reply
            return interaction.reply('The music has been stopped, and I have left the voice channel.');
        } catch (error) {
            console.error('Error while stopping audio or disconnecting from the voice channel:', error);
            return interaction.reply('There was an error stopping the music or disconnecting.');
        }
    }
};
