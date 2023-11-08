<?php

namespace App\Jobs;

use App\Enums\VideoTheme;
use App\Models\Video;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;
use Intervention\Image\Gd\Font;
use Intervention\Image\Image as BaseImage;

class ProcessVideo implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    private BaseImage $backgroundImage;

    private BaseImage $coverImage;

    private BaseImage $watermarkImage;

    private string $imagePath;

    private string $videoPath;

    private string $waveformPath;

    public function __construct(
        private readonly Video $video
    ) {
    }

    public function handle(): void
    {
        $this->video->setAsProcessing();

        $this->processBackground();

        $this->processCover();

        $this->processWatermark();

        $this->generateImage();

        $this->video->setAsRendering();

        $this->renderVideo();

        $this->renderWaveform();

        $this->mergeWaveform();

        $this->cleanup();

        $this->video->setAsFinished();
    }

    private function processBackground(): void
    {
        $this->backgroundImage = Image::make($this->video->coverPath())
            ->fit(1920, 1080)
            ->blur(90);
    }

    private function processCover(): void
    {
        $this->coverImage = Image::make($this->video->coverPath())
            ->fit(885, 885)
            ->mask(resource_path('images/cover-mask.png'), false);
    }

    private function processWatermark(): void
    {
        $textStyle = function (Font $font) {
            $color = $this->video->theme === VideoTheme::Light ? '#ffffff' : '#000000';

            $font->size(48);
            $font->color($color);
            $font->align('center');
            $font->valign('middle');
            $font->file(resource_path('fonts/Roboto-Regular.ttf'));
        };

        $this->watermarkImage = Image::make($this->video->watermarkPath())
            ->fit(885, 885)
            ->text($this->video->videoName(), $this->video->text_x_position, $this->video->text_y_position, $textStyle);
    }

    private function generateImage(): void
    {
        $this->imagePath = Storage::path(Str::random().'.jpg');

        $this->backgroundImage
            ->insert($this->coverImage, 'left', 50)
            ->insert($this->watermarkImage, 'right', 50)
            ->save($this->imagePath);

        $this->backgroundImage->destroy();
        $this->coverImage->destroy();
        $this->watermarkImage->destroy();
    }

    private function renderVideo(): void
    {
        $this->videoPath = Storage::path(Str::random().'.mp4');

        $command = 'ffmpeg '.
            '-loop 1 '.
            '-framerate 30 '.
            "-i $this->imagePath ".
            "-i {$this->video->musicPath()} ".
            '-c:v libx264 '.
            '-preset veryslow '.
            '-crf 0 '.
            '-c:a copy '.
            '-shortest '.
            $this->videoPath;

        exec($command);
    }

    private function renderWaveform(): void
    {
        $this->waveformPath = Storage::path(Str::random().'.mp4');

        $foreground = $this->video->theme === VideoTheme::Light ? 'White' : 'Black';

        $command = 'ffmpeg '.
            "-i {$this->video->musicPath()} ".
            '-filter_complex "[0:a]showwaves=mode=cline:s=885x200:colors='.$foreground.'[sw];'.
            ' color=s=885x200:c=#ff0000[bg];'.
            ' [bg][sw]overlay=format=auto:shortest=1,format=yuv444p,scale=885:200[v]" '.
            '-map "[v]" '.
            '-map 0:a '.
            '-c:a copy '.
            $this->waveformPath;

        exec($command);
    }

    private function mergeWaveform(): void
    {
        $waveformX = 986;
        $waveformY = 784;

        $command = 'ffmpeg '.
            "-i $this->videoPath ".
            "-i $this->waveformPath ".
            '-filter_complex "[1:v]chromakey=0xff0000:0.1:0.1[fg];[0:v][fg]overlay='.$waveformX.':'.$waveformY.'" '.
            $this->video->videoPath();

        exec($command);
    }

    private function cleanup(): void
    {
        Storage::delete(basename($this->imagePath));

        Storage::delete(basename($this->videoPath));

        Storage::delete(basename($this->waveformPath));

        $this->video->cleanResouces();
    }
}
