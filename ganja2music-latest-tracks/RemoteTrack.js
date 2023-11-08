export default class RemoteTrack {
    artistEn;
    artistFa;
    titleEn;
    titleFa;
    coverPhoto;
    normalQuality;
    highQuality;
    lyrics = null;
    lyricistEn = null;
    composerEn = null;
    arrangerEn = null;
    mixerEn = null;

    constructor(releasedAt, url) {
        this.releasedAt = new Date(releasedAt);
        this.url = url;
    }
}