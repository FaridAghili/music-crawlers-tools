export default class RemoteTrack {
    artistEn;
    artistFa;
    titleEn;
    titleFa;
    albumEn;
    albumFa;
    coverPhoto;
    normalQuality;
    highQuality;

    constructor(url) {
        this.url = url;
    }
}