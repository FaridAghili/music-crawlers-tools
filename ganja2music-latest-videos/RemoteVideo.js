export default class RemoteVideo {
    artistEn;
    artistFa;
    titleEn;
    titleFa;
    coverPhoto;
    lowQuality;
    normalQuality;
    highQuality;

    constructor(url) {
        this.url = url;
    }
}