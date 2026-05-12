<?php

$content = file_get_contents('pickme_backend_er_diagram_mermaid.md');

// Extract entities
preg_match_all('/([A-Z_]+)\s*\{\s*([^}]+)\s*\}/', $content, $matches);
$entities = [];
for ($i=0; $i<count($matches[0]); $i++) {
    $tableName = strtolower($matches[1][$i]);
    $lines = explode("\n", trim($matches[2][$i]));
    $fields = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (!$line) continue;
        $parts = preg_split('/\s+/', $line);
        $type = $parts[0];
        $name = $parts[1];
        $modifier = isset($parts[2]) ? $parts[2] : null;
        $fields[] = compact('type', 'name', 'modifier');
    }
    $entities[$tableName] = $fields;
}

// Convert type to Laravel migration type
function mapType($type, $name) {
    if ($type === 'string') {
        return "string('$name')";
    } elseif ($type === 'bigint') {
        if (str_ends_with($name, '_id')) {
            return "foreignId('$name')->constrained()->onDelete('cascade')";
        }
        return "bigInteger('$name')";
    } elseif ($type === 'boolean') {
        return "boolean('$name')->default(false)";
    } elseif ($type === 'timestamp') {
        return "timestamp('$name')->nullable()";
    } elseif ($type === 'date') {
        return "date('$name')->nullable()";
    } elseif ($type === 'decimal') {
        if (in_array($name, ['latitude', 'longitude', 'pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng'])) {
            return "decimal('$name', 10, 8)->nullable()";
        }
        return "decimal('$name', 10, 2)->default(0)";
    } elseif ($type === 'integer') {
        return "integer('$name')";
    } elseif ($type === 'text') {
        return "text('$name')->nullable()";
    }
    return "string('$name')";
}

// Generate Migrations
$migrationFiles = glob('database/migrations/*.php');
foreach ($entities as $table => $fields) {
    // Find the migration file for this table
    $migrationFile = null;
    foreach ($migrationFiles as $file) {
        if (str_contains($file, "create_{$table}_table.php")) {
            $migrationFile = $file;
            break;
        }
    }

    if (!$migrationFile) continue;

    $migrationContent = file_get_contents($migrationFile);
    $upSchema = "";
    foreach ($fields as $field) {
        if ($field['modifier'] === 'PK') {
            $upSchema .= "            \$table->id();\n";
        } elseif ($field['name'] === 'created_at' || $field['name'] === 'updated_at') {
            continue; // handled by timestamps()
        } else {
            $typeStr = mapType($field['type'], $field['name']);
            if (str_ends_with($field['name'], '_id') && $field['modifier'] === 'FK') {
                $refTable = str_replace('_id', 's', $field['name']);
                if ($refTable === 'passengers' || $refTable === 'drivers' || $refTable === 'vehicles') {
                     // standard foreignId is fine, but needs exact table sometimes, we rely on constrained() which guesses from column
                     if ($field['name'] == 'passenger_id' || $field['name'] == 'driver_id' || $field['name'] == 'user_id' || $field['name'] == 'vehicle_id' || $field['name'] == 'fare_id' || $field['name'] == 'ride_id' || $field['name'] == 'promotion_id') {
                         $upSchema .= "            \$table->foreignId('{$field['name']}')->constrained()->onDelete('cascade');\n";
                     } else {
                         $upSchema .= "            \$table->{$typeStr};\n";
                     }
                } else {
                     $upSchema .= "            \$table->{$typeStr};\n";
                }
            } else {
                // If it's a unique field
                if (in_array($field['name'], ['email', 'phone', 'nic', 'license_number', 'vehicle_number', 'ride_code'])) {
                    $upSchema .= "            \$table->{$typeStr}->unique();\n";
                } else {
                    $upSchema .= "            \$table->{$typeStr};\n";
                }
            }
        }
    }
    $upSchema .= "            \$table->timestamps();\n";

    // Replace everything inside Schema::create closure
    $migrationContent = preg_replace(
        '/Schema::create\(\''.$table.'\', function \(Blueprint \$table\) \{(.*?)\}\);/s',
        "Schema::create('$table', function (Blueprint \$table) {\n$upSchema        });",
        $migrationContent
    );
    file_put_contents($migrationFile, $migrationContent);
}

echo "Migrations updated successfully.\n";

// Update Models (Fillable)
$modelsDir = 'app/Models/';
foreach ($entities as $table => $fields) {
    // Determine model name
    // e.g. users -> User, otp_verifications -> OtpVerification
    $modelName = str_replace(' ', '', ucwords(str_replace('_', ' ', rtrim($table, 's'))));
    if ($table === 'ride_statuses') $modelName = 'RideStatus';
    $modelFile = $modelsDir . $modelName . '.php';

    if (!file_exists($modelFile)) continue;

    $fillables = [];
    foreach ($fields as $field) {
        if ($field['modifier'] !== 'PK' && $field['name'] !== 'created_at' && $field['name'] !== 'updated_at') {
            $fillables[] = "'" . $field['name'] . "'";
        }
    }
    $fillableStr = "    protected \$fillable = [\n        " . implode(",\n        ", $fillables) . "\n    ];\n";

    $modelContent = file_get_contents($modelFile);
    if (!str_contains($modelContent, '$fillable')) {
        $modelContent = preg_replace(
            '/use HasFactory;/',
            "use HasFactory;\n\n$fillableStr",
            $modelContent
        );
        file_put_contents($modelFile, $modelContent);
    }
}
echo "Models updated successfully.\n";
