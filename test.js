const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { Innertube } = require('youtubei.js');
const { Readable } = require('stream');
const request = require('request');
const fs = require('fs');
const path = require('path');

// In-memory queue
let queue = [];
let isPaused = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Add a song to the queue and play it.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('YouTube URL or Song Title to play.')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('You need to join a voice channel first!');
        }

        const query = interaction.options.getString('title');
        if (!query) {
            return interaction.editReply('Invalid YouTube URL or song title.');
        }

        // Add the query to the in-memory queue
        queue.push({ query });
        interaction.editReply(`Added to the queue: ${query}`);

        // Start playing if not already
        if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
            playNextSong(voiceChannel, interaction.guild.id, interaction);
        }
    },
};

// Play the next song in the queue
async function playNextSong(voiceChannel, guildId, interaction) {
    // If the queue is empty, leave the voice channel
    if (queue.length === 0) {
        console.log('Queue is empty. Leaving the voice channel.');
        return;
    }

    const nextSong = queue.shift(); // Remove the first song from the queue

    // Check if the query exists in the nextSong object
    if (!nextSong.query || typeof nextSong.query !== 'string') {
        console.error('Error: Song query is invalid.');
        return;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    global.currentPlayer = player;

    try {
        const yt = await Innertube.create();

        let results;

        // Check if the query is a YouTube URL or a title
        if (nextSong.query.startsWith('http')) {
            // If it's a URL, extract the video ID from the URL
            const videoId = extractVideoIdFromUrl(nextSong.query);
            if (videoId) {
                results = [await yt.getBasicInfo(videoId)];
            } else {
                console.error('Invalid YouTube URL. Video ID is missing.');
                return;
            }
        } else {
            // If it's a song title, search for it
            results = await yt.search(nextSong.query);
        }

        if (!results || results.length === 0) {
            console.error("No results found for the URL or title.");
            return;
        }

        const info = await yt.getBasicInfo(results[0].id);
        const format = info.chooseFormat({ type: 'audio', quality: '360p' });

        if (!format) {
            console.error("No suitable audio format found.");
            return;
        }

        const audioUrl = format.decipher(yt.session.player);
        const songIndex = Date.now(); // Use a unique identifier for each song
        const outputPath = path.join(__dirname, `song${songIndex}.mp3`);
        const writeStream = fs.createWriteStream(outputPath);

        // Download the audio file
        request(audioUrl)
            .pipe(writeStream)
            .on('finish', () => {
                const resource = createAudioResource(outputPath);
                player.play(resource);
                connection.subscribe(player);

                console.log(`Now playing: ${nextSong.query}`);

                // Create and send the embed with the "Stop", "Resume", and "Skip" buttons
                const embed = new EmbedBuilder()
                    .setTitle('Now Playing')
                    .setDescription(`Currently playing: ${nextSong.query}`)
                    .setColor('#FF0000')
                    .setThumbnail(results[0].thumbnails[0].url); // Set the thumbnail from YouTube search result

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel('Stop')
                            .setStyle('Danger'),
                        new ButtonBuilder()
                            .setCustomId('skip')
                            .setLabel('Skip')
                            .setStyle('Primary'),
                        new ButtonBuilder()
                            .setCustomId('pause')
                            .setLabel(isPaused ? 'Resume' : 'Pause')
                            .setStyle('Secondary')
                    );

                interaction.followUp({ embeds: [embed], components: [row] });

                player.on(AudioPlayerStatus.Idle, () => {
                    console.log('Finished playing, deleting file and playing the next song.');
                    fs.unlinkSync(outputPath); // Delete the MP3 file
                    playNextSong(voiceChannel, guildId, interaction); // Play the next song in the queue
                });

                player.on('error', (error) => {
                    console.error('Error playing audio:', error);
                    setTimeout(() => {
                        fs.unlinkSync(outputPath); // Delete the MP3 file
                    }, 18000000);
                    playNextSong(voiceChannel, guildId, interaction); // Play the next song in the queue
                });
            })
            .on('error', (err) => {
                console.error('Error downloading the audio:', err);
                playNextSong(voiceChannel, guildId, interaction); // Continue with the next song if there's an error
            });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId, interaction); // Continue with the next song if there's an error
    }
}

// Helper function to extract video ID from URL
function extractVideoIdFromUrl(url) {
    const regex = /(?:https?:\/\/(?:www\.)?youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|https?:\/\/youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
