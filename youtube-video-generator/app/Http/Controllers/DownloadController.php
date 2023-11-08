<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadController extends Controller
{
    public function __invoke(Video $video): BinaryFileResponse
    {
        abort_unless($video->isFinished(), 404);

        $file = $video->videoName().'.mp4';

        return response()->download($video->videoPath(), $file);
    }
}
