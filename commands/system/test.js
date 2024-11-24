const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('A button that can toggle lock state'),

    async execute(interaction) {
        // Lock Button (initial state)
        const lockButton = new ButtonBuilder()
            .setCustomId('lock')
            .setLabel('Lock')
            .setStyle('Danger'); // Red button

        const unlockButton = new ButtonBuilder()
            .setCustomId('unlock')
            .setLabel('Unlock')
            .setStyle('Success'); // Green button

        // Embed setup for initial state (Lock)
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('Lock State')
            .setDescription('The system is currently locked.');

        const row = new ActionRowBuilder().addComponents(lockButton);

        // Send the initial response with embed and button
        await interaction.reply({ content: 'Toggle lock state:', embeds: [embed], components: [row] });

        // Filter for valid button presses (only lock or unlock buttons, and only the user who invoked the command)
        const filter = i => ['lock', 'unlock'].includes(i.customId) && i.user.id === interaction.user.id;

        // Set up the message component collector with a longer timeout
        const collector = interaction.channel.createMessageComponentCollector({ filter /*, time: 15000*/ });

        collector.on('collect', async i => {
            let updatedEmbed;
            let updatedButton;

            // Toggle between lock and unlock
            if (i.customId === 'lock') {
                updatedEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('Lock State')
                    .setDescription('The system is unlocked.');
                updatedButton = unlockButton; // Change to Unlock button
            } else if (i.customId === 'unlock') {
                updatedEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Lock State')
                    .setDescription('The system is locked.');
                updatedButton = lockButton; // Change to Lock button
            }

            // Update the message with the new embed and the other button
            await i.update({
                embeds: [updatedEmbed],
                components: [new ActionRowBuilder().addComponents(updatedButton)],
            });

            // Restart the collector after each interaction (so it keeps listening for button presses)
            collector.resetTimer();
        });

        collector.on('end', collected => {
            console.log(`Collected ${collected.size} interactions.`);

            // Optionally send a message when the collector ends
            interaction.followUp({ content: 'The button toggle interaction has ended.' });
        });
    }
};
