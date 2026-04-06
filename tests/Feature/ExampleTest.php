<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the welcome page loads', function () {
    $this->get(route('home'))->assertOk();
});
