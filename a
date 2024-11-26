const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
} = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { Innertube } = require('youtubei.js');
const request = require('request');

// In-memory queue
let queue = [];
let isPaused = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Add a song to the queue and play it.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('YouTube title of the song to play.')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        let input = interaction.options.getString('title');

        const yt = await Innertube.create();
        const { results } = await yt.search(input);

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **Error**')
                .setDescription('You need to join a voice channel first!')
                .setColor('#FF0000')
                .setThumbnail('https://uxwing.com/wp-content/themes/uxwing/download/signs-and-symbols/error-icon.png')  // Custom error icon
                .setTimestamp()
                .setFooter({ text: 'TPH Music', iconURL: 'https://i.ibb.co/m4tjmrk/Screenshot-2024-11-25-074857.png' });  // Footer with bot icon
            return interaction.editReply({ embeds: [embed] });
        }

        const url = interaction.options.getString('title');
        if (!url) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **Error**')
                .setDescription('Song title not found.')
                .setColor('#FF0000')
                .setThumbnail('https://uxwing.com/wp-content/themes/uxwing/download/signs-and-symbols/error-icon.png')  // Custom error icon
                .setTimestamp()
                .setFooter({ text: 'TPH Music', iconURL: 'https://i.ibb.co/m4tjmrk/Screenshot-2024-11-25-074857.png' });  // Footer with bot icon
            return interaction.editReply({ embeds: [embed] });
        }


        if (!results || results.length === 0 || !results[0].thumbnails || results[0].thumbnails.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ **Error**')
                .setDescription('No results found | URL not supported for your search query. **/play <title>**')
                .setColor('#FF0000')
                .setThumbnail('https://uxwing.com/wp-content/themes/uxwing/download/signs-and-symbols/error-icon.png')
                .setTimestamp()
                .setFooter({ text: 'TPH Music', iconURL: 'https://i.ibb.co/m4tjmrk/Screenshot-2024-11-25-074857.png' });
            return interaction.editReply({ embeds: [embed] });
        }
        
        let ytThumbnail = results[0].thumbnails[0].url;
        let ytTitle = results[0].title;
        const duration = results[0].duration.text;
        
        // Add the URL to the in-memory queue
        queue.push({ url });
        const embed = new EmbedBuilder()
            .setTitle('✅ **Song Added**')
            .setDescription(`The song has been added to the queue.`)
            .addFields(
                { name: 'Song Title:', value: `${ytTitle}`, inline: true },
                { name: 'Duration:', value: `${duration}`, inline: true }
            )
            .setColor('#32CD32')  // Success color
            .setThumbnail(`${ytThumbnail}`)  // Success icon
            .setTimestamp()
            .setFooter({ text: 'TPH Music', iconURL: 'https://i.ibb.co/m4tjmrk/Screenshot-2024-11-25-074857.png' });
        interaction.editReply({ embeds: [embed] });

        // Start playing if not already
        if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
            playNextSong(voiceChannel, interaction.guild.id, interaction);
        }
    },
};
// Play the next song in the queue
async function playNextSong(voiceChannel, guildId, interaction) {
    if (queue.length === 0) {
        console.log('Queue is empty. Leaving the voice channel.');
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy(); // Safely disconnect if still connected
        }
        return; // Stop further execution
    }

    const nextSong = queue.shift(); // Remove the first song from the queue

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    global.currentPlayer = player;

    try {
        const yt = await Innertube.create();
        const { results } = await yt.search(nextSong.url);

        if (!results || results.length === 0) {
            console.error('No results found.');
            return;
        }

        const info = await yt.getBasicInfo(results[0].id);
        const format = info.chooseFormat({ type: 'audio', quality: '360p' });

        if (!format) {
            console.error('No suitable audio format found.');
            return;
        }

        const audioUrl = format.decipher(yt.session.player);
        const resource = createAudioResource(audioUrl);
        player.play(resource);
        connection.subscribe(player);

        console.log(`Now playing: ${results[0].title}`);


        // Set up an interval to update the embed
        const durationText = results[0].duration.text; // Example: "1:00:00"

            const embed = new EmbedBuilder()
                .setTitle('🎶 **Now Playing** 🎶')
                .setDescription(`**Song:** [${results[0].title}]\n**Artist:** ${results[0].author.name}\n**Duration:** ${durationText}`)
                .setColor('#FF4500')
                .setThumbnail("https://i.ibb.co/xgQnzqp/youtube-3938026.png")
                .setImage(results[0].thumbnails[0].url)
                .addFields(
                    { name: '🎧 Audio Quality', value: 'High', inline: true },
                    { name: '⏯️ Current Status', value: 'Playing', inline: true }
                )
                .setFooter({ text: 'Brought to you by TPH Music', iconURL: 'https://i.ibb.co/m4tjmrk/Screenshot-2024-11-25-074857.png' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pause')
                        .setLabel(isPaused ? 'Resume' : 'Pause')
                        .setStyle(isPaused ? 'Primary' : 'Secondary')
                );

            interaction.followUp({ embeds: [embed], components: [row] });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Finished playing. Moving to the next song.');
            
            playNextSong(voiceChannel, guildId, interaction); // Play the next song
        });

        player.on('error', (error) => {
            console.error('Error playing audio:', error);
            
            playNextSong(voiceChannel, guildId, interaction); // Play the next song
        });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId, interaction); // Continue with the next song
    }
}