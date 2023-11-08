<x-layout>
    @if (session('success'))
        <div class="alert alert-primary"
             role="alert">
            {{ session('message') }}
        </div>
    @endif

    <div class="card">
        <div class="card-header fw-bold">
            Create new Video
        </div>

        <div class="card-body">
            <form class="d-flex flex-column gap-3"
                  method="post"
                  action="{{ route('generator') }}"
                  enctype="multipart/form-data">
                @csrf

                <div>
                    <label class="form-label"
                           for="cover">
                        Cover
                        <span class="small text-muted">(*.jpg)</span>
                    </label>

                    <input @class(['form-control', 'is-invalid' => $errors->has('cover')])
                           type="file"
                           id="cover"
                           name="cover"
                           accept=".jpg"
                           required>

                    @error('cover')
                    <div class="invalid-feedback">
                        {{ $message }}
                    </div>
                    @enderror
                </div>

                <div>
                    <label class="form-label"
                           for="watermark">
                        Watermark
                        <span class="small text-muted">(*.png)</span>
                    </label>

                    <input @class(['form-control', 'is-invalid' => $errors->has('watermark')])
                           type="file"
                           id="watermark"
                           name="watermark"
                           accept=".png"
                           required>

                    <div class="form-text">
                        885px x 885px
                        (<a href="{{ asset('watermark-example.png') }}"
                            target="_blank">Example</a>)
                    </div>

                    @error('watermark')
                    <div class="invalid-feedback">
                        {{ $message }}
                    </div>
                    @enderror
                </div>

                <div>
                    <label class="form-label"
                           for="music">
                        Music
                        <span class="small text-muted">(*.mp3)</span>
                    </label>

                    <input @class(['form-control', 'is-invalid' => $errors->has('music')])
                           type="file"
                           id="music"
                           name="music"
                           accept=".mp3"
                           required>

                    @error('music')
                    <div class="invalid-feedback">
                        {{ $message }}
                    </div>
                    @enderror
                </div>

                <div>
                    <label class="form-label"
                           for="theme">
                        Theme
                    </label>

                    <select class="form-select"
                            id="theme"
                            name="theme"
                            required>
                        <option value="{{ \App\Enums\VideoTheme::Light->value }}"
                                @selected(old('theme') === \App\Enums\VideoTheme::Light->value)>
                            {{ \App\Enums\VideoTheme::Light->value }}
                        </option>

                        <option value="{{ \App\Enums\VideoTheme::Dark->value }}"
                                @selected(old('theme') === \App\Enums\VideoTheme::Dark->value)>
                            {{ \App\Enums\VideoTheme::Dark->value }}
                        </option>
                    </select>
                </div>

                <div>
                    <label class="form-label"
                           for="artist">
                        Artist
                        <span class="small text-muted">(English)</span>
                    </label>

                    <input @class(['form-control', 'is-invalid' => $errors->has('artist')])
                           type="text"
                           id="artist"
                           name="artist"
                           value="{{ old('artist') }}"
                           maxlength="100"
                           required>

                    @error('artist')
                    <div class="invalid-feedback">
                        {{ $message }}
                    </div>
                    @enderror
                </div>

                <div>
                    <label class="form-label"
                           for="title">
                        Title
                        <span class="small text-muted">(English)</span>
                    </label>

                    <input @class(['form-control', 'is-invalid' => $errors->has('title')])
                           type="text"
                           id="title"
                           name="title"
                           value="{{ old('title') }}"
                           maxlength="100"
                           required>

                    @error('title')
                    <div class="invalid-feedback">
                        {{ $message }}
                    </div>
                    @enderror
                </div>

                <div class="d-flex gap-2">
                    <div class="flex-fill">
                        <label class="form-label"
                               for="text_x_position">
                            Text X Position
                        </label>

                        <input @class(['form-control', 'is-invalid' => $errors->has('text_x_position')])
                               type="text"
                               inputmode="numeric"
                               id="text_x_position"
                               name="text_x_position"
                               value="{{ old('text_x_position') }}"
                               required>

                        <div class="form-text">
                            A number between 0 and 885
                        </div>

                        @error('text_x_position')
                        <div class="invalid-feedback">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>

                    <div class="flex-fill">
                        <label class="form-label"
                               for="text_y_position">
                            Text Y Position
                        </label>

                        <input @class(['form-control', 'is-invalid' => $errors->has('text_y_position')])
                               type="text"
                               inputmode="numeric"
                               id="text_y_position"
                               name="text_y_position"
                               value="{{ old('text_y_position') }}"
                               required>

                        <div class="form-text">
                            A number between 0 and 885
                        </div>

                        @error('text_y_position')
                        <div class="invalid-feedback">
                            {{ $message }}
                        </div>
                        @enderror
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button class="btn btn-primary"
                            type="submit">
                        Submit
                    </button>

                    <button class="btn btn-danger"
                            type="reset">
                        Reset
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div class="card">
        <div class="card-header fw-bold">
            History
        </div>

        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered align-middle mb-0">
                    <thead>
                        <tr>
                            <th scope="col">Status</th>
                            <th scope="col">Artist</th>
                            <th scope="col">Title</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        @forelse ($videos as $video)
                            <tr>
                                <td>
                                    {{ $video->status }}
                                </td>

                                <td>
                                    {{ $video->artist }}
                                </td>

                                <td>
                                    {{ $video->title }}
                                </td>

                                <td>
                                    @if ($video->isFinished())
                                        <div class="d-flex gap-2">
                                            <a href="{{ route('download', $video) }}">
                                                Download
                                            </a>

                                            <a class="link-danger"
                                               href="{{ route('delete', $video) }}"
                                               onclick="return confirm('Are you sure?')">
                                                Delete
                                            </a>
                                        </div>
                                    @else
                                        N/A
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4">
                                    Nothing yet.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</x-layout>