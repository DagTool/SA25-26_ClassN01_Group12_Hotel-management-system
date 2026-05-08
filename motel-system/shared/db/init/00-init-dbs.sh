#!/bin/bash
set -e

echo "Creating multiple databases for microservices..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE room_db;
    CREATE DATABASE guest_db;
    CREATE DATABASE booking_db;
    CREATE DATABASE payment_db;
    CREATE DATABASE inventory_db;
EOSQL

echo "Databases created successfully!"
