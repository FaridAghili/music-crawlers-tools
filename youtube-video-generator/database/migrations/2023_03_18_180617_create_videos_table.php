<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('status');
            $table->string('cover');
            $table->string('watermark');
            $table->string('music');
            $table->string('theme');
            $table->string('artist');
            $table->string('title');
            $table->unsignedInteger('text_x_position');
            $table->unsignedInteger('text_y_position');
            $table->timestamps();
        });
    }
};
