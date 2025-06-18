<?php

$image_data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent PNG
$file_path = __DIR__ . '/../aset/default-menu.png';

// Pastikan direktori aset ada
if (!is_dir(dirname($file_path))) {
    mkdir(dirname($file_path), 0777, true);
}

if (file_put_contents($file_path, base64_decode($image_data))) {
    echo 'Gambar default-menu.png berhasil dibuat di ' . $file_path;
} else {
    echo 'Gagal membuat gambar default-menu.png.';
}

?> 