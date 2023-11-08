<?php

namespace App\Models;

use App\Enums\VideoStatus;
use App\Enums\VideoTheme;
use App\Http\Requests\GeneratorRequest;
use App\Jobs\ProcessVideo;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Video extends Model
{
    use HasUlids;

    protected $casts = [
        'status' => VideoStatus::class,
        'theme' => VideoTheme::class,
    ];

    public static function createFromRequest(GeneratorRequest $request): self
    {
        $video = new Video();
        $video->status = VideoStatus::Pending;
        $video->cover = $request->file('cover')->store();
        $video->watermark = $request->file('watermark')->store();
        $video->music = $request->file('music')->store();
        $video->theme = $request->enum('theme', VideoTheme::class);
        $video->artist = $request->string('artist');
        $video->title = $request->string('title');
        $video->text_x_position = $request->integer('text_x_position');
        $video->text_y_position = $request->integer('text_y_position');
        $video->save();

        ProcessVideo::dispatch($video);

        return $video;
    }

    public function setAsProcessing(): void
    {
        $this->status = VideoStatus::Processing;
        $this->save();
    }

    public function setAsRendering(): void
    {
        $this->status = VideoStatus::Rendering;
        $this->save();
    }

    public function setAsFinished(): void
    {
        $this->status = VideoStatus::Finished;
        $this->save();
    }

    public function cleanResouces(): void
    {
        Storage::delete($this->cover);
        Storage::delete($this->watermark);
        Storage::delete($this->music);
    }

    public function isFinished(): bool
    {
        return $this->status === VideoStatus::Finished;
    }

    public function coverPath(): string
    {
        return Storage::path($this->cover);
    }

    public function watermarkPath(): string
    {
        return Storage::path($this->watermark);
    }

    public function musicPath(): string
    {
        return Storage::path($this->music);
    }

    public function videoName(): string
    {
        return $this->artist.' - '.$this->title;
    }

    public function videoPath(): string
    {
        return Storage::path($this->id.'.mp4');
    }
}
