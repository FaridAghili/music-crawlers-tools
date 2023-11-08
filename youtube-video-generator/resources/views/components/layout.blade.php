<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport"
              content="width=device-width, initial-scale=1">
        <title>{{ config('app.name') }}</title>
        @vite('resources/css/app.scss')
    </head>
    <body class="vh-100 d-flex flex-column">
        <div class="container flex-fill p-3">
            <main class="d-flex flex-column gap-3">
                {{ $slot }}
            </main>
        </div>
    </body>
</html>
