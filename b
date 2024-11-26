const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { Innertube } = require('youtubei.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');

let queue = [];
let isPlaying = false;
let isPaused = false;
let currentPlayer = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Add a song to the queue and play it.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('YouTube title of the song to play.')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('playnow')
                .setDescription('Play the song immediately and replace the current one.')
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const input = interaction.options.getString('title');
        const playNow = interaction.options.getBoolean('playnow') || false;
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ **Error**')
                        .setDescription('You need to join a voice channel first!')
                        .setColor('#FF0000'),
                ],
            });
        }

        const yt = await Innertube.create();
        const { results } = await yt.search(input);

        if (!results || results.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ **Error**')
                        .setDescription('No results found for your query.')
                        .setColor('#FF0000'),
                ],
            });
        }

        const song = {
            title: results[0].title,
            url: results[0].id,
            duration: results[0].duration.text,
            thumbnail: results[0].thumbnails[0].url,
        };

        if (playNow) {
            // Interrupt current song and play immediately
            queue.unshift(song); // Add the song at the front of the queue
            playNowSong(voiceChannel, interaction.guild.id, interaction);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎶 **Playing Now**')
                        .setDescription(`[${song.title}](https://youtube.com/watch?v=${song.url})`)
                        .addFields(
                            { name: 'Duration', value: song.duration, inline: true }
                        )
                        .setColor('#32CD32')
                        .setThumbnail(song.thumbnail),
                ],
            });
        } else {
            // Add song to the queue
            queue.push(song);
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ **Added to Queue**')
                        .setDescription(`[${song.title}](https://youtube.com/watch?v=${song.url})`)
                        .addFields(
                            { name: 'Duration', value: song.duration, inline: true }
                        )
                        .setColor('#32CD32')
                        .setThumbnail(song.thumbnail),
                ],
            });

            if (!isPlaying) {
                playNextSong(voiceChannel, interaction.guild.id, interaction);
            }
        }
    },
};

// Play the next song in the queue
// Play the next song in the queue
async function playNextSong(voiceChannel, guildId, interaction) {
    if (queue.length === 0) {
        console.log('Queue is empty. Leaving the voice channel.');
        const connection = getVoiceConnection(guildId);
        if (connection) {
            // Only destroy the connection if there's no player and the queue is empty
            if (!currentPlayer) {
                connection.destroy(); // Safely disconnect if still connected
            }
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

    if (currentPlayer && currentPlayer !== null) {
        console.log('Already playing, skipping song.');
        return; // Prevent interrupting the current song unless playNow is true
    }

    currentPlayer = player;

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

        const durationText = results[0].duration.text;
        player.on(AudioPlayerStatus.Playing, () => {
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
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Finished playing. Moving to the next song.');
            currentPlayer = null; // Reset currentPlayer after song finishes
            playNextSong(voiceChannel, guildId, interaction);
        });

        player.on('error', (error) => {
            console.error('Error playing audio:', error);
            playNextSong(voiceChannel, guildId, interaction);
        });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId, interaction);
    }
}


// Play the current song immediately, replacing the current one
async function playNowSong(voiceChannel, guildId, interaction) {
    if (queue.length === 0) return; // If the queue is empty, do nothing

    const currentSong = queue.shift(); // Get the song to play now
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    currentPlayer = player;

    try {
        const yt = await Innertube.create();
        const { results } = await yt.search(currentSong.url);

        if (!results || results.length === 0) {
            console.error('No results found for the playNow song.');
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

        console.log(`Now playing immediately: ${results[0].title}`);

        const durationText = results[0].duration.text;
        player.on(AudioPlayerStatus.Playing, () => {
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
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Finished playing. Moving to the next song.');
            currentPlayer = null; // Reset currentPlayer after song finishes
            playNextSong(voiceChannel, guildId, interaction);
        });

        player.on('error', (error) => {
            console.error('Error playing audio:', error);
            playNextSong(voiceChannel, guildId, interaction);
        });
    } catch (error) {
        console.error('Error handling song playback:', error);
        playNextSong(voiceChannel, guildId, interaction);
    }
}
