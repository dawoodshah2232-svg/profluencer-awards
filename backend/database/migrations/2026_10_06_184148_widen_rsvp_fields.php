<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Widen rsvps.guest_type with the public form's attendee types and
     * add an optional contact mobile. Mirrors database/schema.sql.
     * ENUM alteration needs raw SQL on MySQL.
     */
    public function up(): void
    {
        /* ENUM alteration is MySQL-specific raw SQL; on SQLite/Postgres the
           column is already a compatible text type, so only run it there. */
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `rsvps` MODIFY `guest_type` ENUM('winner','honouree','guest','vip','media','team','nominee','sponsor','brand') NOT NULL DEFAULT 'guest'");
        }

        Schema::table('rsvps', function (Blueprint $table): void {
            $table->string('mobile', 40)->nullable()->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table): void {
            $table->dropColumn('mobile');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `rsvps` MODIFY `guest_type` ENUM('winner','honouree','guest','vip','media','team') NOT NULL DEFAULT 'guest'");
        }
    }
};
