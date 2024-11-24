module.exports = (client) => {
    const channelID = "1186245631531044984";  // Replace with your channel ID

    // Listen for when a member leaves the server
    client.on('guildMemberRemove', (member) => {
        console.log(`${member.tag} has left the server.`);  // Log the user who left

        const message = `Goodbye <@${member.id}>! We'll miss you!`;

        const channel = member.guild.channels.cache.get(channelID);
        if (!channel) {
            console.error("Channel not found or bot doesn't have permission!");
            return;
        }

        // Send the goodbye message to the specified channel
        channel.send(message)
            .then(() => console.log('Goodbye message sent successfully'))
            .catch(error => console.error('Error sending goodbye message:', error));
    });
};
