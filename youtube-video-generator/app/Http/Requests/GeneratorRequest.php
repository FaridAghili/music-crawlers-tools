<?php

namespace App\Http\Requests;

use App\Enums\VideoTheme;
use Illuminate\Foundation\Http\FormRequest;

class GeneratorRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array|string>
     */
    public function rules(): array
    {
        return [
            'cover' => ['required', 'file', 'mimes:jpg', 'max:5000'],
            'watermark' => ['required', 'file', 'mimes:png', 'max:5000'],
            'music' => ['required', 'file', 'mimes:mp3', 'max:20000'],
            'theme' => ['required', 'string', 'in:'.VideoTheme::Light->value.','.VideoTheme::Dark->value],
            'artist' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:100'],
            'text_x_position' => ['required', 'integer', 'min:0', 'max:885'],
            'text_y_position' => ['required', 'integer', 'min:0', 'max:885'],
        ];
    }
}
