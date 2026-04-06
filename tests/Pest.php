<?php

use Tests\DuskTestCase;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature');
pest()->extend(DuskTestCase::class)->in('Browser');
