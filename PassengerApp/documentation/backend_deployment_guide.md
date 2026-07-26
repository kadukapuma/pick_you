# Backend Deployment Guide

This guide outlines the steps to deploy your Laravel backend application, along with PostgreSQL and Redis, on a Virtual Private Server (VPS). This document assumes a Debian/Ubuntu-based Linux distribution for the VPS.

## 1. Project Analysis for Deployment

Your project consists of:
- **Laravel Application (backend-api):** This is your core API.
- **PostgreSQL:** Your primary database.
- **Redis:** Used for caching, sessions, and queues.
- **DriverApp & PassengerApp:** Mobile applications that will consume your backend API.

Key considerations for deployment:
- **Environment Variables:** The `.env` file in `backend-api` will contain critical configuration (database credentials, Redis connection, app key, etc.). These should be securely managed on the VPS.
- **Dependencies:** PHP, Composer, Node.js (for frontend asset compilation, though not strictly required for backend deployment if assets are pre-built), Nginx/Apache, PostgreSQL server, Redis server.
- **Queue Workers:** Laravel's queue system often requires a persistent process manager like Supervisor.
- **Security:** Firewall, SSH key-based authentication, secure environment variable handling.

## 2. VPS Setup

### 2.1 Choose a VPS Provider
Select a VPS provider (e.g., DigitalOcean, AWS EC2, Linode, Vultr) and provision a server. For this guide, we'll assume a clean Ubuntu 22.04 LTS installation.

### 2.2 Initial Server Setup

1.  **Connect via SSH:**
    ```bash
    ssh root@YOUR_VPS_IP
    ```

2.  **Create a New Sudo User (Optional but Recommended):**
    ```bash
    adduser YOUR_USERNAME
    usermod -aG sudo YOUR_USERNAME
    ```
    Switch to the new user:
    ```bash
    su - YOUR_USERNAME
    ```

3.  **Update System Packages:**
    ```bash
    sudo apt update
    sudo apt upgrade -y
    ```

4.  **Configure Firewall (UFW):**
    Allow SSH, HTTP, HTTPS:
    ```bash
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx HTTP'
    sudo ufw allow 'Nginx HTTPS'
    sudo ufw enable
    sudo ufw status
    ```

5.  **Set Up Timezone:**
    ```bash
    sudo timedatectl set-timezone YOUR_TIMEZONE_HERE # e.g., Africa/Lagos
    ```

## 3. Laravel Application Deployment

### 3.1 Install Dependencies

1.  **Install Nginx:**
    ```bash
    sudo apt install nginx -y
    ```

2.  **Install PHP and Extensions (PHP 8.2+ recommended for Laravel 10+):**
    ```bash
    sudo apt install php8.2-fpm php8.2-common php8.2-mysql php8.2-xml php8.2-zip php8.2-mbstring php8.2-curl php8.2-redis php8.2-pgsql -y
    ```

3.  **Install Composer:**
    ```bash
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    ```

4.  **Install Git:**
    ```bash
    sudo apt install git -y
    ```

### 3.2 Clone Your Project

1.  **Choose a deployment directory:** A common practice is `/var/www/your_project_name`.
    ```bash
    sudo mkdir -p /var/www/pick_you_backend
    sudo chown -R YOUR_USERNAME:YOUR_USERNAME /var/www/pick_you_backend
    cd /var/www/pick_you_backend
    ```

2.  **Clone your backend repository:**
    ```bash
    git clone YOUR_GIT_REPOSITORY_URL .
    ```

### 3.3 Configure Laravel

1.  **Copy `.env.example` to `.env`:**
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env`:** Open `.env` and configure your database, Redis, APP_URL, and other settings. **Crucially, generate an `APP_KEY`:**
    ```bash
    php artisan key:generate
    ```

3.  **Install Composer Dependencies:**
    ```bash
    composer install --no-dev --optimize-autoloader
    ```

4.  **Set Permissions:**
    ```bash
    sudo chown -R www-data:www-data storage bootstrap/cache
    sudo chmod -R 775 storage bootstrap/cache
    ```

5.  **Run Migrations and Seeders (if applicable):**
    ```bash
    php artisan migrate --force
    # php artisan db:seed --force # Only if you have seeders for production
    ```

### 3.4 Configure Nginx

1.  **Create a new Nginx server block configuration:**
    ```bash
    sudo nano /etc/nginx/sites-available/pick_you_backend
    ```
    Add the following content (replace `your_domain.com` with your actual domain or VPS IP):
    ```nginx
    server {
        listen 80;
        server_name your_domain.com www.your_domain.com;
        root /var/www/pick_you_backend/public;

        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
        add_header Referrer-Policy "no-referrer-when-downgrade";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

        index index.php index.html index.htm;

        charset utf-8;

        location / {
            try_files $uri $uri/ /index.php?$query_string;
        }

        location = /favicon.ico { access_log off; log_not_found off; }
        location = /robots.txt  { access_log off; log_not_found off; }

        error_page 404 /index.php;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 32k;
            fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
            include fastcgi_params;
        }

        location ~ /\.ht {
            deny all;
        }
    }
    ```

2.  **Enable the site and restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/pick_you_backend /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

## 4. PostgreSQL Setup

1.  **Install PostgreSQL:**
    ```bash
    sudo apt install postgresql postgresql-contrib -y
    ```

2.  **Access PostgreSQL Prompt:**
    ```bash
    sudo -i -u postgres psql
    ```

3.  **Create a new user and database:**
    ```sql
    CREATE USER pickyou_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
    CREATE DATABASE pickyou_db OWNER pickyou_user;
    \q
    ```
    **Note:** Replace `pickyou_user`, `YOUR_SECURE_PASSWORD`, and `pickyou_db` with your desired credentials. Update your Laravel `.env` file accordingly.

4.  **Configure PostgreSQL to allow remote connections (Optional & if needed):**
    By default, PostgreSQL only listens on `localhost`. If your Laravel app is on the same server, this is fine. If not, you'd need to edit `postgresql.conf` and `pg_hba.conf`.

## 5. Redis Installation and Configuration

1.  **Install Redis Server:**
    ```bash
    sudo apt install redis-server -y
    ```

2.  **Configure Redis (Optional, for security):**
    By default, Redis is accessible on `localhost` without a password. For production, it's recommended to set a password.
    ```bash
    sudo nano /etc/redis/redis.conf
    ```
    Uncomment and set a password:
    ```
    requirepass YOUR_REDIS_PASSWORD
    ```
    Also, ensure it only binds to `127.0.0.1` unless you explicitly need remote access and have secured it appropriately.

3.  **Restart Redis:**
    ```bash
    sudo systemctl restart redis-server
    sudo systemctl enable redis-server
    ```

4.  **Update Laravel `.env`:**
    Ensure your `.env` has the correct Redis host, port, and password if you set one:
    ```
    REDIS_HOST=127.0.0.1
    REDIS_PASSWORD=YOUR_REDIS_PASSWORD
    REDIS_PORT=6379
    ```

## 6. Process Management (Laravel Queues with Supervisor)

If your Laravel application uses queues, you'll need a process monitor like Supervisor to keep your queue workers running.

1.  **Install Supervisor:**
    ```bash
    sudo apt install supervisor -y
    ```

2.  **Create a Supervisor configuration file for your Laravel queue:**
    ```bash
    sudo nano /etc/supervisor/conf.d/laravel-worker.conf
    ```
    Add the following content (adjust `numprocs` and `command` as needed):
    ```ini
    [program:laravel-worker]
    process_name=%(program_name)s_%(process_num)02d
    command=php /var/www/pick_you_backend/artisan queue:work --sleep=3 --tries=3 --daemon
    autostart=true
    autorestart=true
    user=YOUR_USERNAME
    numprocs=1
    redirect_stderr=true
    stdout_logfile=/var/www/pick_you_backend/storage/logs/supervisor_laravel_worker.log
    ```

3.  **Update and restart Supervisor:**
    ```bash
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl start laravel-worker:*
    ```

## 7. Environment Variables and Security Best Practices

-   **Sensitive Information:** Never hardcode sensitive information (API keys, database passwords) directly in your code. Always use environment variables (`.env`).
-   **`.env` Security:** Ensure your `.env` file has correct permissions (`chmod 600 .env`) and is not accessible via web.
-   **SSH Keys:** Use SSH keys for server access instead of passwords.
-   **Regular Updates:** Keep your OS packages (`sudo apt upgrade`) and PHP/Composer dependencies (`composer update`) up to date.
-   **Backups:** Implement a regular backup strategy for your database and application files.
-   **Monitoring:** Set up monitoring for your server resources and application logs.

This guide provides a comprehensive overview. Adapt specific commands and configurations based on your project's unique requirements and your chosen VPS environment. Good luck with your deployment!