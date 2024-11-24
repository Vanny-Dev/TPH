const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const mongoose = require('mongoose'); // Mongoose for MongoDB connection
const { Innertube } = require('youtubei.js');
const Queue = require('./queueModel'); // Import the Queue model

// Set up the MongoDB connection
mongoose.connect('mongodb+srv://vannydev:vannydev@cluster0.7bqlx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('Error connecting to MongoDB:', err));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a song to the queue to be played after the current song.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title of the song to add.')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('You need to join a voice channel first!');
        }

        const title = interaction.options.getString('title');
        if (!title) {
            return interaction.editReply('Invalid song title.');
        }

        // Add the song metadata to the MongoDB queue collection (without downloading)
        const newSong = new Queue({ title });
        await newSong.save();

        interaction.editReply(`Added to the queue to play after the current song: ${title}`);

        // If no song is currently playing, start the first song in the queue
        if (!global.currentPlayer || global.currentPlayer.state.status === AudioPlayerStatus.Idle) {
            playNextSong(voiceChannel, interaction.guild.id);
        }
    }
};

// Play the next song in the MongoDB queue
async function playNextSong(voiceChannel, guildId) {
    // Get the next song from the MongoDB queue
    const nextSong = await Queue.findOne().sort({ addedAt: 1 }).exec(); // Sort by the earliest added song
    if (!nextSong) {
        console.log('Queue is empty. Leaving the voice channel.');
        return;
    }

    // Remove the song from the queue after playing
    await Queue.deleteOne({ _id: nextSong._id });

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    global.currentPlayer = player;

    try {
        const yt = await Innertube.create();
        const { results } = await yt.search(nextSong.title);
        if (!results || results.length === 0) {
            console.error("No results found for the title.");
            return;
        }

        const info = await yt.getBasicInfo(results[0].id);
        const format = info.chooseFormat({ type: 'audio', quality: '360p' });
        if (!format) {
            console.error("No suitable audio format found.");
            return;
        }

        // Directly stream the audio from YouTube
        const audioUrl = format.decipher(yt.session.player);
        const resource = createAudioResource(audioUrl);

        player.play(resource);
        connection.subscribe(player);

        console.log(`Now playing: ${nextSong.title}`);

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Finished playing, playing the next song.');
            playNextSong(voiceChannel, guildId); // Play the next song in the queue
        });

        player.on('error', (error) => {
            console.error('Error playing audio:', error);
            playNextSong(voiceChannel, guildId); // Continue with the next song if there's an error
        });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId); // Continue with the next song if there's an error
    }
}
