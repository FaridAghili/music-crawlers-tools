<?php

namespace App\Http\Controllers;

use App\Http\Requests\GeneratorRequest;
use App\Models\Video;
use Illuminate\Http\RedirectResponse;

class GeneratorController extends Controller
{
    public function __invoke(GeneratorRequest $request): RedirectResponse
    {
        Video::createFromRequest($request);

        return to_route('home')->with([
            'success' => true,
            'message' => 'Video added to queue, this might take a while.',
        ]);
    }
}
