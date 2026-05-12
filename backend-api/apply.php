<?php
$content = file_get_contents('backend_implementation.md');
preg_match_all('/###\s+`([^`]+)`\s*```php\s*(.*?)\s*```/s', $content, $matches);

for ($i = 0; $i < count($matches[0]); $i++) {
    $filePath = trim($matches[1][$i]);
    $code = $matches[2][$i];
    
    // Make sure the directory exists
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    
    file_put_contents($filePath, "<?php\n" . ltrim($code, "<?php\n"));
    echo "Updated $filePath\n";
}
