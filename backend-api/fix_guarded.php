<?php

$modelsDir = __DIR__ . '/app/Models';
$files = glob($modelsDir . '/*.php');

foreach ($files as $file) {
    $content = file_get_contents($file);
    if (!str_contains($content, '$fillable') && !str_contains($content, '$guarded')) {
        // Find the class definition and insert protected $guarded = [];
        $content = preg_replace(
            '/class\s+[A-Za-z0-9_]+\s+extends\s+Model\s*\{/',
            "$0\n    protected \$guarded = ['id'];\n",
            $content
        );
        file_put_contents($file, $content);
        echo "Added guarded to " . basename($file) . "\n";
    }
}
