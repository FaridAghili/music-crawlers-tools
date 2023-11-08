<?php

namespace App\Enums;

enum VideoStatus: string
{
    case Pending = 'Pending';
    case Processing = 'Processing';
    case Rendering = 'Rendering';
    case Finished = 'Finished';
}
