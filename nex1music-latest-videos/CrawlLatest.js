import axios from 'axios';
import qs from 'qs';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteVideo from './RemoteVideo.js';
import { runAfterDelay } from './Helpers.js';

const LATEST_POSTS_URL = 'https://www.appmusic.ir/WebService/category.php';
const POST_DETAILS_URL = 'https://appmusic.ir/WebService/music-more.php';
const TRANSFER_API_URL = 'https://www.ahanghaa.com/api/v1/import/video';
const TRANSFER_API_KEY = 'ffbb04aa-8393-4f52-8378-5859b2eb964c';

let latestPostId = null;
let remoteVideos = [];

await crawl();

async function crawl() {
    console.info('Crawling latest posts...');

    let posts = await axios.post(LATEST_POSTS_URL, qs.stringify({
        page_number: 1,
        type: 'music',
        category: 'videoirani'
    })).then(response => {
        const posts = response.data;

        if (posts.length === 0) {
            console.error('No posts found.');
            return null;
        }

        return posts;
    }).catch(error => {
        console.error(`Crawling failed: ${error}`);
        return null;
    });

    if (!Array.isArray(posts)) {
        runAfterDelay(crawl, 1);
        console.info('Idle...');
        return;
    }

    const latestPostIndex = latestPostId ? posts.findIndex(post => post.id === latestPostId) : -1;
    if (latestPostIndex === 0) {
        console.info('No new posts found.');

        runAfterDelay(crawl, 5);
        console.info('Idle...');
        return;
    }

    posts = latestPostIndex > 0 ? posts.slice(0, latestPostIndex) : posts;
    latestPostId = posts.at(0).id;

    await PromisePool.for(posts).withConcurrency(posts.length).process(processPost);
    console.info(`${remoteVideos.length} new videos crawled.`);

    if (remoteVideos.length) {
        await PromisePool.for(remoteVideos).withConcurrency(1).process(sendForTransfer);
    }

    remoteVideos = [];

    runAfterDelay(crawl, 5);
    console.info('Idle...');
}

async function processPost(post) {
    const data = await axios.post(POST_DETAILS_URL, qs.stringify({
        post_id: post.id
    })).then(response => response.data).catch(() => null);

    if (!data) {
        return;
    }

    const remoteVideo = new RemoteVideo(data.PostUrl);
    remoteVideo.artistEn = data.ArtistEn.trim();
    remoteVideo.artistFa = data.ArtistFa.trim();
    remoteVideo.titleEn = data.TrackEn.trim();
    remoteVideo.titleFa = data.TrackFa.trim();
    remoteVideo.coverPhoto = data.Image.trim();
    remoteVideo.lowQuality = data.Video480.trim();
    remoteVideo.normalQuality = data.Video720.trim();
    remoteVideo.highQuality = data.Video1080.trim();
    remoteVideo.lyrics = data.Lyrics.trim();

    if (remoteVideo.lyrics.length < 10 || remoteVideo.lyrics.isEnglish()) {
        remoteVideo.lyrics = null;
    }

    remoteVideos.push(remoteVideo);
}

async function sendForTransfer(remoteVideo) {
    await axios.post(TRANSFER_API_URL, {
        api_key: TRANSFER_API_KEY,
        artist_en: remoteVideo.artistEn,
        artist_fa: remoteVideo.artistFa,
        title_en: remoteVideo.titleEn,
        title_fa: remoteVideo.titleFa,
        cover_photo: remoteVideo.coverPhoto,
        low_quality: remoteVideo.lowQuality,
        normal_quality: remoteVideo.normalQuality,
        high_quality: remoteVideo.highQuality,
        lyrics: remoteVideo.lyrics,
        url: remoteVideo.url
    }).then(response => {
        if (response.data.success) {
            console.info(`Video sent for transfer: ${remoteVideo.url}`);
        } else {
            console.warn(`Duplicated video ignored: ${remoteVideo.url}`);
        }
    }).catch(error => console.error(`Failed to send video to transfer: ${error}`));
}