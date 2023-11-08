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

    persist(database) {
        database.query('INSERT INTO remote_tracks SET ?', {
            artist_en: this.artistEn,
            artist_fa: this.artistFa,
            title_en: this.titleEn,
            title_fa: this.titleFa,
            cover_photo: this.coverPhoto,
            normal_quality: this.normalQuality,
            high_quality: this.highQuality,
            lyrics: this.lyrics,
            lyricist_en: this.lyricistEn,
            composer_en: this.composerEn,
            arranger_en: this.arrangerEn,
            mixer_en: this.mixerEn,
            released_at: this.releasedAt,
            url: this.url
        });
    }
}