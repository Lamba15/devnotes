<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('subtotal_amount', 12, 2)->default(0)->after('currency');
            $table->decimal('discount_total_amount', 12, 2)->default(0)->after('subtotal_amount');
            $table->string('public_id')->nullable()->after('notes');
            $table->string('public_pdf_path')->nullable()->after('public_id');
            $table->timestamp('public_pdf_generated_at')->nullable()->after('public_pdf_path');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->string('description');
            $table->decimal('hours', 12, 2)->nullable();
            $table->decimal('rate', 12, 2)->nullable();
            $table->decimal('base_amount', 12, 2);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('invoice_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_item_id')->nullable()->constrained('invoice_items')->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->string('label')->nullable();
            $table->string('type');
            $table->decimal('value', 12, 4);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        DB::table('invoices')
            ->orderBy('id')
            ->get()
            ->each(function ($invoice): void {
                $publicId = 'inv_'.strtolower((string) Str::ulid());
                $amount = round((float) $invoice->amount, 2);

                DB::table('invoices')
                    ->where('id', $invoice->id)
                    ->update([
                        'subtotal_amount' => $amount,
                        'discount_total_amount' => 0,
                        'public_id' => $publicId,
                    ]);

                DB::table('invoice_items')->insert([
                    'invoice_id' => $invoice->id,
                    'position' => 1,
                    'description' => 'Invoice '.$invoice->reference,
                    'hours' => null,
                    'rate' => null,
                    'base_amount' => $amount,
                    'amount' => $amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique('public_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_discounts');
        Schema::dropIfExists('invoice_items');

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['public_id']);
            $table->dropColumn([
                'subtotal_amount',
                'discount_total_amount',
                'public_id',
                'public_pdf_path',
                'public_pdf_generated_at',
            ]);
        });
    }
};
