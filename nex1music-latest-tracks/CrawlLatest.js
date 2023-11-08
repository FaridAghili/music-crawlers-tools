import axios from 'axios';
import qs from 'qs';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteTrack from './RemoteTrack.js';
import { runAfterDelay } from './Helpers.js';

const LATEST_POSTS_URL = 'https://www.appmusic.ir/WebService/category.php';
const POST_DETAILS_URL = 'https://appmusic.ir/WebService/music-more.php';
const TRANSFER_API_URL = 'https://www.ahanghaa.com/api/v1/import/music';
const TRANSFER_API_KEY = 'ffbb04aa-8393-4f52-8378-5859b2eb964c';

let latestPostId = null;
let remoteTracks = [];

await crawl();

async function crawl() {
    console.info('Crawling latest posts...');

    let posts = await axios.post(LATEST_POSTS_URL, qs.stringify({
        page_number: 1,
        type: 'music',
        category: 'musicirani'
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
    console.info(`${remoteTracks.length} new tracks crawled.`);

    if (remoteTracks.length) {
        await PromisePool.for(remoteTracks).withConcurrency(1).process(sendForTransfer);
    }

    remoteTracks = [];

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

    const remoteTrack = new RemoteTrack(data.PostUrl);
    remoteTrack.artistEn = data.ArtistEn.trim();
    remoteTrack.artistFa = data.ArtistFa.trim();
    remoteTrack.titleEn = data.TrackEn.trim();
    remoteTrack.titleFa = data.TrackFa.trim();
    remoteTrack.coverPhoto = data.Image.trim();
    remoteTrack.normalQuality = data.Music128.trim();
    remoteTrack.highQuality = data.Music320.trim();
    remoteTrack.lyrics = data.Lyrics.trim();

    if (remoteTrack.lyrics.length < 10 || remoteTrack.lyrics.isEnglish()) {
        remoteTrack.lyrics = null;
    }

    remoteTracks.push(remoteTrack);
}

async function sendForTransfer(remoteTrack) {
    await axios.post(TRANSFER_API_URL, {
        api_key: TRANSFER_API_KEY,
        artist_en: remoteTrack.artistEn,
        artist_fa: remoteTrack.artistFa,
        title_en: remoteTrack.titleEn,
        title_fa: remoteTrack.titleFa,
        cover_photo: remoteTrack.coverPhoto,
        normal_quality: remoteTrack.normalQuality,
        high_quality: remoteTrack.highQuality,
        lyrics: remoteTrack.lyrics,
        url: remoteTrack.url
    }).then(response => {
        if (response.data.success) {
            console.info(`Track sent for transfer: ${remoteTrack.url}`);
        } else {
            console.warn(`Duplicated track ignored: ${remoteTrack.url}`);
        }
    }).catch(error => console.error(`Failed to send track to transfer: ${error}`));
}