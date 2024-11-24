const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to the config.json file where the GIF URL is stored
const configFilePath = path.join(__dirname, 'gifConfig.json');

// Function to get the current GIF URL from the config.json
function getCurrentGif() {
    const data = fs.readFileSync(configFilePath, 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData.welcomeGif;
}

module.exports = (client) => {
    const channelID = "1186245631531044984";  // Channel to send the welcome message
    const infos = "1186245631531044984";     // Info channel ID
    const rules = "1186245631531044984";    // Rules channel ID
    const introduction = "1186245631531044984";  // Introduction channel ID
    const helpdesk = "1186245631531044984";  // Helpdesk channel ID

    client.on('guildMemberAdd', (member) => {
        console.log(`${member.tag} has joined the server!`);

        // Get channel objects from the guild
        const infosChannel = member.guild.channels.cache.get(infos);
        const rulesChannel = member.guild.channels.cache.get(rules);
        const introductionChannel = member.guild.channels.cache.get(introduction);
        const helpdeskChannel = member.guild.channels.cache.get(helpdesk);

        if (!infosChannel || !rulesChannel || !introductionChannel || !helpdeskChannel) {
            console.error('One or more channels were not found!');
            return;
        }

        // Get the current GIF URL from config.json
        const currentGifUrl = getCurrentGif();

        // Create the embed message
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FFB6C1')  // Color of the embed
            .setTitle(`🎉 Welcome to **${member.guild.name}**, ${member.user.username}! 🎉`)  // Title of the embed
            .setDescription(`
                **Hey <@${member.id}>!**  
                We're thrilled to have you here! 🥳

                Make sure to check ${infosChannel} for more info and join the fun! 🎮  
                Here's your first step:
            `)  // Description with channel mentions
            .setThumbnail(member.user.avatarURL({ dynamic: true }))  // Set member's avatar (with dynamic option for animated avatars)
            .addFields(
                { name: '🚀 Your first step:', value: `Introduce yourself in the ${introductionChannel} channel!` },
                { name: '📜 Please read the rules:', value: `Make sure to check out the ${rulesChannel} channel before chatting!` },
                { name: '💬 Have questions?', value: `Feel free to ask in the ${helpdeskChannel} channel.` }
            )
            .setImage(currentGifUrl)  // Use the current GIF URL
            .setFooter({ 
                text: `We're so happy to have you here, ${member.user.username}!`, 
                iconURL: member.guild.iconURL()  // Set server icon in footer
            })
            .setTimestamp();  // Add timestamp to the embed

        // Get the channel where the welcome message should be sent
        const channel = member.guild.channels.cache.get(channelID);
        if (!channel) {
            console.error('Channel not found or bot doesn’t have permission!');
            return;
        }

        // Send the embed to the channel
        channel.send({ embeds: [welcomeEmbed] })
            .then(() => console.log('Welcome message sent successfully!'))
            .catch(error => console.error('Error sending welcome message:', error));
    });
};
