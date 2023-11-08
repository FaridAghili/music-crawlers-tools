export default class RemoteVideo {
    artistEn;
    artistFa;
    titleEn;
    titleFa;
    coverPhoto;
    lowQuality;
    normalQuality;
    highQuality;
    lyrics = null;

    constructor(url) {
        this.url = url;
    }
}