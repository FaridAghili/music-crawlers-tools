import axios from 'axios';
import striptags from 'striptags';
import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteTrack from './RemoteTrack.js';
import { runAfterDelay } from './Helpers.js';

const LATEST_POSTS_URL = 'https://www.ganja2music.com/wp-json/wp/v2/posts?categories=9&per_page=25&page=1';
const TRANSFER_API_URL = 'https://www.ahanghaa.com/api/v1/import/music';
const TRANSFER_API_KEY = 'ffbb04aa-8393-4f52-8378-5859b2eb964c';

let latestPostLink = null;
let remoteTracks = [];

await crawl();

async function crawl() {
    console.info('Crawling latest posts...');

    let posts = await axios.get(LATEST_POSTS_URL).then(response => {
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

    const latestPostIndex = latestPostLink ? posts.findIndex(post => post.link === latestPostLink) : -1;
    if (latestPostIndex === 0) {
        console.info('No new posts found.');

        runAfterDelay(crawl, 5);
        console.info('Idle...');
        return;
    }

    posts = latestPostIndex > 0 ? posts.slice(0, latestPostIndex) : posts;
    latestPostLink = posts.at(0).link;

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
    const postTitle = post.title.rendered;
    const postExcerpt = post.excerpt.rendered;

    if (postTitle.includes('Podcast') || postExcerpt.includes('پادکست')) {
        return;
    }

    const remoteTrack = new RemoteTrack(post.date_gmt, post.link);

    const english = decode(postTitle).split(' – ');

    remoteTrack.artistEn = english[0].trim();
    remoteTrack.titleEn = english[1].trim();

    if (remoteTrack.artistEn.length === 0 || remoteTrack.titleEn.length === 0) {
        return;
    }

    const persian = striptags(postExcerpt)
        .replace('دانلود آهنگ جدید', '')
        .replace('انلود آهنگ جدید', '')
        .replace('آهنگ جدید', '')
        .replace(remoteTrack.artistEn, '')
        .replace(remoteTrack.titleEn, '')
        .split(' به نام ');

    remoteTrack.artistFa = persian[0].trim();
    remoteTrack.titleFa = persian[1].trim();

    if (remoteTrack.artistFa.length === 0 || remoteTrack.titleFa.length === 0) {
        return;
    }

    if (remoteTrack.artistFa.isEnglish() || remoteTrack.artistFa.includesAny(['دانلود', 'آهنگ', 'جدید', 'دمو', 'دموی', 'ورژن', 'بسیار زیبا', 'زیبای', 'شاد', '(', ')'])) {
        return;
    }

    if (remoteTrack.titleFa.isEnglish() || remoteTrack.titleFa.includesAny([',', '،', '/', '(', ')', ':'])) {
        return;
    }

    const data = await axios.get(remoteTrack.url).then(response => response.data);
    const document = new JSDOM(data).window.document;

    remoteTrack.coverPhoto = document.querySelector('.insidercover > img').src;
    if (!remoteTrack.coverPhoto.includes('ganja2music.com')) {
        remoteTrack.coverPhoto = 'https://www.ganja2music.com' + remoteTrack.coverPhoto;
    }

    if (!remoteTrack.coverPhoto.includes('.jpg')) {
        return;
    }

    const files = document.querySelectorAll('a.dlbter');
    if (files.length === 0) {
        return;
    }

    remoteTrack.normalQuality = files[0].href.trim();
    remoteTrack.highQuality = files.length > 1 ? files[1].href.trim() : '';

    if (remoteTrack.normalQuality.length === 0 && remoteTrack.highQuality.length === 0) {
        return;
    }

    if (!remoteTrack.normalQuality.includes('.mp3') && !remoteTrack.highQuality.includes('.mp3')) {
        return;
    }

    remoteTrack.normalQuality = remoteTrack.normalQuality.length > 0 ? remoteTrack.normalQuality : null;
    remoteTrack.highQuality = remoteTrack.highQuality.length > 0 ? remoteTrack.highQuality : null;

    const lyricsRaw = document.querySelector('#lyricarea p')?.innerHTML;

    if (lyricsRaw !== undefined) {
        remoteTrack.lyrics = decode(striptags(lyricsRaw)).trim();

        if (remoteTrack.lyrics.length < 10 || remoteTrack.lyrics.isEnglish()) {
            remoteTrack.lyrics = null;
        }
    }

    const artists = document.querySelector('.detailer')?.innerHTML;

    for (let line of striptags(artists).split('\n')) {
        line = decode(line).trim();

        if (line.length === 0) {
            continue;
        }

        if (line.includes('Lyrics') && line.includes(':')) {
            remoteTrack.lyricistEn = line.split(':')[1].trim();
            remoteTrack.lyricistEn = remoteTrack.lyricistEn.length > 0 ? remoteTrack.lyricistEn : null;
        }

        if (line.includes('Music') && line.includes(':')) {
            remoteTrack.composerEn = line.split(':')[1].trim();
            remoteTrack.composerEn = remoteTrack.composerEn.length > 0 ? remoteTrack.composerEn : null;
        }

        if (line.includes('Arrangement') && line.includes(':')) {
            remoteTrack.arrangerEn = line.split(':')[1].trim();
            remoteTrack.arrangerEn = remoteTrack.arrangerEn.length > 0 ? remoteTrack.arrangerEn : null;
        }

        if (line.includes('Mix') && line.includes(':')) {
            remoteTrack.mixerEn = line.split(':')[1].trim();
            remoteTrack.mixerEn = remoteTrack.mixerEn.length > 0 ? remoteTrack.mixerEn : null;
        }
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
        lyricist_en: remoteTrack.lyricistEn,
        composer_en: remoteTrack.composerEn,
        arranger_en: remoteTrack.arrangerEn,
        mixer_en: remoteTrack.mixerEn,
        url: remoteTrack.url
    }).then(response => {
        if (response.data.success) {
            console.info(`Track sent for transfer: ${remoteTrack.url}`);
        } else {
            console.warn(`Duplicated track ignored: ${remoteTrack.url}`);
        }
    }).catch(error => console.error(`Failed to send track to transfer: ${error}`));
}
