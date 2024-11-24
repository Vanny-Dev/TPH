const { SlashCommandBuilder } = require('discord.js');
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Add a song to the queue and play it.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('YouTube URL of the song to play.')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('You need to join a voice channel first!');
        }

        const url = interaction.options.getString('title');
        if (!url) {
            return interaction.editReply('Invalid YouTube URL.');
        }

        // Add the URL to the in-memory queue
        queue.push({ url });
        interaction.editReply(`Added to the queue: ${url}`);

        // Start playing if not already
        if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
            playNextSong(voiceChannel, interaction.guild.id);
        }
    },
};

// Play the next song in the queue
async function playNextSong(voiceChannel, guildId) {
    // If the queue is empty, leave the voice channel
    if (queue.length === 0) {
        console.log('Queue is empty. Leaving the voice channel.');
        return;
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
            console.error("No results found for the URL.");
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

                console.log(`Now playing: ${nextSong.url}`);

                player.on(AudioPlayerStatus.Idle, () => {
                    console.log('Finished playing, deleting file and playing the next song.');
                    fs.unlinkSync(outputPath); // Delete the MP3 file
                    playNextSong(voiceChannel, guildId); // Play the next song in the queue
                });

                player.on('error', (error) => {
                    console.error('Error playing audio:', error);
                    (setTimeout(() => {
                        fs.unlinkSync(outputPath); // Delete the MP3 file
                    },18000000))
                    
                    playNextSong(voiceChannel, guildId); // Play the next song in the queue
                });
            })
            .on('error', (err) => {
                console.error('Error downloading the audio:', err);
                playNextSong(voiceChannel, guildId); // Continue with the next song if there's an error
            });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId); // Continue with the next song if there's an error
    }
}
