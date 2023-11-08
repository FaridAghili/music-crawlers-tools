import axios from 'axios';
import qs from 'qs';
import { PromisePool } from '@supercharge/promise-pool';
import RemoteTrack from './RemoteTrack.js';
import { runAfterDelay } from './Helpers.js';

const LATEST_ALBUMS_URL = 'https://www.appmusic.ir/WebService/category.php';
const ALBUM_DETAILS_URL = 'https://appmusic.ir/WebService/music-more.php';
const TRANSFER_API_URL = 'https://www.ahanghaa.com/api/v1/import/music';
const TRANSFER_API_KEY = 'ffbb04aa-8393-4f52-8378-5859b2eb964c';

let latestAlbumId = null;
let remoteTracks = [];

await crawl();

async function crawl() {
    console.info('Crawling latest albums...');

    let albums = await axios.post(LATEST_ALBUMS_URL, qs.stringify({
        page_number: 1,
        type: 'music',
        category: 'albumirani'
    })).then(response => {
        const albums = response.data;

        if (albums.length === 0) {
            console.error('No albums found.');
            return null;
        }

        return albums;
    }).catch(error => {
        console.error(`Crawling failed: ${error}`);
        return null;
    });


    if (!Array.isArray(albums)) {
        runAfterDelay(crawl, 1);
        console.info('Idle...');
        return;
    }

    const latestAlbumIndex = latestAlbumId ? albums.findIndex(album => album.id === latestAlbumId) : -1;
    if (latestAlbumIndex === 0) {
        console.info('No new albums found.');

        runAfterDelay(crawl, 5);
        console.info('Idle...');
        return;
    }

    albums = latestAlbumIndex > 0 ? albums.slice(0, latestAlbumIndex) : albums;
    latestAlbumId = albums.at(0).id;

    await PromisePool.for(albums).withConcurrency(albums.length).process(processAlbum);
    console.info(`${remoteTracks.length} new tracks crawled.`);

    if (remoteTracks.length) {
        await PromisePool.for(remoteTracks).withConcurrency(1).process(sendForTransfer);
    }

    remoteTracks = [];

    runAfterDelay(crawl, 5);
    console.info('Idle...');
}

async function processAlbum(album) {
    const data = await axios.post(ALBUM_DETAILS_URL, qs.stringify({
        post_id: album.id
    })).then(response => response.data).catch(() => null);

    if (!data) {
        return;
    }

    JSON.parse(data.AlbumTrackList).forEach((track, index) => {
        const remoteTrack = new RemoteTrack(`${data.PostUrl}#${index}`);
        remoteTrack.artistEn = data.ArtistEn.trim();
        remoteTrack.artistFa = data.ArtistFa.trim();
        remoteTrack.titleEn = track.album_track_name_en.trim();
        remoteTrack.titleFa = track.album_track_name_fa.trim();
        remoteTrack.albumEn = data.TrackEn.trim();
        remoteTrack.albumFa = data.TrackFa.trim();
        remoteTrack.coverPhoto = data.Image.trim();
        remoteTrack.normalQuality = track.album_track_link_128.trim();
        remoteTrack.highQuality = track.album_track_link_320.trim();

        remoteTracks.push(remoteTrack);
    })
}

async function sendForTransfer(remoteTrack) {
    await axios.post(TRANSFER_API_URL, {
        api_key: TRANSFER_API_KEY,
        artist_en: remoteTrack.artistEn,
        artist_fa: remoteTrack.artistFa,
        title_en: remoteTrack.titleEn,
        title_fa: remoteTrack.titleFa,
        album_en: remoteTrack.albumEn,
        album_fa: remoteTrack.albumFa,
        cover_photo: remoteTrack.coverPhoto,
        normal_quality: remoteTrack.normalQuality,
        high_quality: remoteTrack.highQuality,
        url: remoteTrack.url
    }).then(response => {
        if (response.data.success) {
            console.info(`Track sent for transfer: ${remoteTrack.url}`);
        } else {
            console.warn(`Duplicated track ignored: ${remoteTrack.url}`);
        }
    }).catch(error => console.error(`Failed to send track to transfer: ${error}`));
}