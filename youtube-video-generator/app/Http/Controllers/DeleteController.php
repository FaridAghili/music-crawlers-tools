<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

class DeleteController extends Controller
{
    public function __invoke(Video $video): RedirectResponse
    {
        abort_unless($video->isFinished(), 404);

        Storage::delete(basename($video->videoPath()));

        $video->delete();

        return to_route('home')->with([
            'success' => true,
            'message' => 'Video has been deleted.',
        ]);
    }
}
