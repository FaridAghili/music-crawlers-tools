import axios from 'axios';
import striptags from 'striptags';
import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteVideo from './RemoteVideo.js';
import { runAfterDelay } from './Helpers.js';

const LATEST_POSTS_URL = 'https://www.ganja2music.com/wp-json/wp/v2/posts?categories=13&per_page=25&page=1';
const TRANSFER_API_URL = 'https://www.ahanghaa.com/api/v1/import/video';
const TRANSFER_API_KEY = 'ffbb04aa-8393-4f52-8378-5859b2eb964c';

let latestPostLink = null;
let remoteVideos = [];

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
    console.info(`${remoteVideos.length} new videos crawled.`);

    if (remoteVideos.length) {
        await PromisePool.for(remoteVideos).withConcurrency(1).process(sendForTransfer);
    }

    remoteVideos = [];

    runAfterDelay(crawl, 5);
    console.info('Idle...');
}

async function processPost(post) {
    const postTitle = post.title.rendered;
    const postExcerpt = post.excerpt.rendered;

    const remoteVideo = new RemoteVideo(post.link);

    const english = decode(postTitle).split(' – ');

    remoteVideo.artistEn = english[0].trim();
    remoteVideo.titleEn = english[1].trim();

    if (remoteVideo.artistEn.length === 0 || remoteVideo.titleEn.length === 0) {
        return;
    }

    const persian = striptags(postExcerpt)
        .replace('دانلود ویدئو جدید', '')
        .replace('دانلود ویدیو جدید', '')
        .replace(remoteVideo.artistEn, '')
        .replace(remoteVideo.titleEn, '')
        .split(' به نام ');

    remoteVideo.artistFa = persian[0].trim();
    remoteVideo.titleFa = persian[1].trim();

    if (remoteVideo.artistFa.length === 0 || remoteVideo.titleFa.length === 0) {
        return;
    }

    if (remoteVideo.artistFa.isEnglish() || remoteVideo.artistFa.includesAny(['دانلود', 'آهنگ', 'جدید', 'دمو', 'دموی', 'ورژن', 'بسیار زیبا', 'زیبای', 'شاد', '(', ')'])) {
        return;
    }

    if (remoteVideo.titleFa.isEnglish() || remoteVideo.titleFa.includesAny([',', '،', '/', '(', ')', ':'])) {
        return;
    }

    const data = await axios.get(remoteVideo.url).then(response => response.data);
    const document = new JSDOM(data).window.document;

    remoteVideo.coverPhoto = document.querySelector('meta[property="og:image"]').content;
    if (!remoteVideo.coverPhoto.includes('.jpg')) {
        return;
    }

    document.querySelectorAll('a.dlbter').forEach(link => {
        if (link.textContent.includes('480p')) {
            remoteVideo.lowQuality = link.href.trim();
        }

        if (link.textContent.includes('720p')) {
            remoteVideo.normalQuality = link.href.trim();
        }

        if (link.textContent.includes('1080p')) {
            remoteVideo.highQuality = link.href.trim();
        }
    });

    if (remoteVideo.lowQuality.length === 0 && remoteVideo.normalQuality.length === 0 && remoteVideo.highQuality.length === 0) {
        return;
    }

    if (!remoteVideo.lowQuality.includes('.mp4') && !remoteVideo.normalQuality.includes('.mp4') && !remoteVideo.highQuality.includes('.mp4')) {
        return;
    }

    remoteVideo.lowQuality = remoteVideo.lowQuality.length > 0 ? remoteVideo.lowQuality : null;
    remoteVideo.normalQuality = remoteVideo.normalQuality.length > 0 ? remoteVideo.normalQuality : null;
    remoteVideo.highQuality = remoteVideo.highQuality.length > 0 ? remoteVideo.highQuality : null;

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
        url: remoteVideo.url
    }).then(response => {
        if (response.data.success) {
            console.info(`Video sent for transfer: ${remoteVideo.url}`);
        } else {
            console.warn(`Duplicated video ignored: ${remoteVideo.url}`);
        }
    }).catch(error => console.error(`Failed to send video to transfer: ${error}`));
}