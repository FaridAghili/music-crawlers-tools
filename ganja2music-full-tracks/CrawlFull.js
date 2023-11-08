import axios from 'axios';
import mysql from 'mysql';
import striptags from 'striptags';
import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteTrack from './RemoteTrack.js';
import './Helpers.js';

const LATEST_POSTS_URL = 'https://www.ganja2music.com/wp-json/wp/v2/posts?categories=9&per_page=100&page=';

const database = mysql.createConnection({
    database: 'test',
    user: 'root'
});

const startPage = 1;
const concurrency = 50;

await crawl(startPage);

async function crawl(page) {
    console.info(`Crawling page ${page}`);

    const posts = await axios.get(LATEST_POSTS_URL + page)
        .then(response => response.data)
        .catch(error => {
            console.error(error.response.data.code);
            return null;
        });

    if (posts === null) {
        console.warn('No more posts.');
        return;
    }

    await PromisePool.for(posts).withConcurrency(concurrency).process(processPost);

    crawl(page + 1);
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

    remoteTrack.coverPhoto = document.querySelector('.topin > img').src;
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

    remoteTrack.persist(database);
}