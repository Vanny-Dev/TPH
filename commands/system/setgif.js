const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');


const configFilePath = path.join(__dirname, '../../gifConfig.json');

function updateGifUrl(newGifUrl) {
    const data = fs.readFileSync(configFilePath, 'utf-8');
    const jsonData = JSON.parse(data);
    jsonData.welcomeGif = newGifUrl;


    fs.writeFileSync(configFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgif')
        .setDescription('Set a new welcome GIF for the server.')
        .addStringOption(option => 
            option.setName('gifurl')
                .setDescription('Enter the new GIF URL')
                .setRequired(true)
        ),
    async execute(interaction) {
        const newGifUrl = interaction.options.getString('gifurl');

 
        if (!newGifUrl.match(/\.(gif|png|jpeg|jpg)$/)) {
            return interaction.reply({ content: 'Please provide a valid GIF or image URL.', ephemeral: true });
        }

        // Update the GIF URL in gifConfig.json
        updateGifUrl(newGifUrl);

        await interaction.reply({ content: `The welcome GIF has been updated! New GIF URL: ${newGifUrl}`, ephemeral: true });
    },
};
