const { Innertube } = require('youtubei.js');
const fs = require('fs');
const request = require('request');
const { set } = require('mongoose');

(async () => {
    try {
        const start = Date.now();
        const yt = await Innertube.create();

        // Search for the video
        const { results } = await yt.search(`mahika lyrics`);
        if (!results || results.length === 0) {
            console.error("No results found.");
            return;
        }

        const info = await yt.getBasicInfo(results[0].id);
        const format = info.chooseFormat({ type: 'audio', quality: '360p' });
        if (!format) {
            console.error("No suitable audio format found.");
            return;
        }

        const url = format.decipher(yt.session.player);
        const path = 'mahika.mp3';
        const file = fs.createWriteStream(path);

       
        

        console.log(results[0].thumbnails[0].url);
        // Extract video details
        const title = results[0].title;
        const views = results[0].short_view_count;
        const duration = results[0].duration.text;

        // Download the audio
        request(url)
            .pipe(file)
            .on('finish', () => {
                console.log("Audio Downloaded");
                
                // Log details to the console
                const end = Date.now();
                const execTime = end - start;
                console.log(`Title: ${title}`);
                console.log(`Views: ${views}`);
                console.log(`Duration: ${duration}`);
                console.log(`Execution Time: ${execTime} ms`);

                // Delete the file after processing
                setTimeout(() => {
                    fs.unlinkSync(path);
                }, 5000)
                
                console.log("Temporary file deleted.");
            })
            .on('error', (err) => {
                console.error("Error downloading the audio:", err);
            });
    } catch (err) {
        console.error(`Error occurred: ${err.message}`);
    }
})();
