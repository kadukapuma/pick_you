<?php

namespace Tests\Integration;

use PDO;
use PDOException;
use PHPUnit\Framework\TestCase;

class PostgresRidePaymentConcurrencyTest extends TestCase
{
    private PDO $first;

    private PDO $second;

    protected function setUp(): void
    {
        parent::setUp();

        if (getenv('RUN_POSTGRES_CONCURRENCY_TESTS') !== 'true') {
            $this->markTestSkipped('Set RUN_POSTGRES_CONCURRENCY_TESTS=true and POSTGRES_CONCURRENCY_DSN to run.');
        }

        $dsn = getenv('POSTGRES_CONCURRENCY_DSN');
        if (! $dsn) {
            $this->markTestSkipped('POSTGRES_CONCURRENCY_DSN is required.');
        }

        $username = getenv('POSTGRES_CONCURRENCY_USER') ?: null;
        $password = getenv('POSTGRES_CONCURRENCY_PASSWORD') ?: null;
        $this->first = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->second = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        $this->first->exec('DROP TABLE IF EXISTS codex_concurrency_payments');
        $this->first->exec('DROP TABLE IF EXISTS codex_concurrency_rides');
        $this->first->exec('CREATE TABLE codex_concurrency_rides (id BIGINT PRIMARY KEY, status VARCHAR(20) NOT NULL)');
        $this->first->exec('CREATE TABLE codex_concurrency_payments (id BIGSERIAL PRIMARY KEY, ride_id BIGINT NOT NULL UNIQUE, transaction_id VARCHAR(100) NOT NULL UNIQUE)');
        $this->first->exec("INSERT INTO codex_concurrency_rides (id, status) VALUES (1, 'REQUESTED')");
    }

    protected function tearDown(): void
    {
        if (isset($this->first)) {
            $this->first->exec('DROP TABLE IF EXISTS codex_concurrency_payments');
            $this->first->exec('DROP TABLE IF EXISTS codex_concurrency_rides');
        }

        parent::tearDown();
    }

    public function test_ride_row_lock_serializes_competing_mutations(): void
    {
        $this->first->beginTransaction();
        $this->first->query('SELECT * FROM codex_concurrency_rides WHERE id = 1 FOR UPDATE')->fetch();

        $this->second->exec("SET lock_timeout = '100ms'");
        $this->second->beginTransaction();

        try {
            $this->second->exec("UPDATE codex_concurrency_rides SET status = 'ACCEPTED' WHERE id = 1 AND status = 'REQUESTED'");
            $this->fail('A competing mutation should not acquire a locked ride row.');
        } catch (PDOException) {
            $this->second->rollBack();
        }

        $this->first->exec("UPDATE codex_concurrency_rides SET status = 'ACCEPTED' WHERE id = 1");
        $this->first->commit();

        $affected = $this->second->exec("UPDATE codex_concurrency_rides SET status = 'ACCEPTED' WHERE id = 1 AND status = 'REQUESTED'");
        $this->assertSame(0, $affected);
    }

    public function test_unique_ride_payment_constraint_rejects_double_charge(): void
    {
        $this->first->exec("INSERT INTO codex_concurrency_payments (ride_id, transaction_id) VALUES (1, 'txn_first')");

        $this->expectException(PDOException::class);
        $this->second->exec("INSERT INTO codex_concurrency_payments (ride_id, transaction_id) VALUES (1, 'txn_second')");
    }
}
