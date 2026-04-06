<?php

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

test('guest landing page shows auth entry points', function () {
    $this->browse(function (Browser $browser) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->visit('/login')
            ->waitFor("input[name='email']", 20)
            ->assertPresent("input[name='email']")
            ->assertPresent("input[name='password']");
    });
});
