const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');

// Stop command implementation
module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the playback and clear the queue.'),
    async execute(interaction) {

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            const player = global.currentPlayer;

            // Pause the player if it's playing
            if (player && player.state.status !== AudioPlayerStatus.Idle) {
                player.stop(); // Stop the current playback
            }

            // Disconnect from the voice channel without destroying the connection
            connection.disconnect(); // Safely disconnect
        }

        const embed = new EmbedBuilder()
            .setTitle('🛑 **Playback Stopped**')
            .setDescription('The queue has been cleared, and playback has been stopped.')
            .setColor('#FF0000')
            .setTimestamp()
            .setFooter({ text: 'TPH Music' });
        interaction.reply({ embeds: [embed] });
    },
};
