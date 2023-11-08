export default class RemoteTrack {
    artistEn;
    artistFa;
    titleEn;
    titleFa;
    coverPhoto;
    normalQuality;
    highQuality;
    lyrics = null;

    constructor(url) {
        this.url = url;
    }
}