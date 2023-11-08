<?php

use App\Http\Controllers\DeleteController;
use App\Http\Controllers\DownloadController;
use App\Http\Controllers\GeneratorController;
use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)
    ->name('home');

Route::post('generator', GeneratorController::class)
    ->name('generator');

Route::get('{video}', DownloadController::class)
    ->name('download');

Route::get('{video}/delete', DeleteController::class)
    ->name('delete');
