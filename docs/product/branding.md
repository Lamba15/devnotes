# Branding

## Purpose

This file captures the currently inherited brand assets and color direction that should come forward into `devnotes`.

It records what is already known from the previous system and leaves open the decisions that still need refinement.

## Current Brand Source

The current inherited brand source is the previous admin system:

- repository: `Lamba15/nouraboelsoud-admin`

Branding should be carried forward from that system rather than reinvented arbitrarily.

## Logo Assets

Current copied assets in this repository:

- [`public/branding/logo-wide.png`](/home/aboelsoud/WebstormProjects/devnotes/public/branding/logo-wide.png)
- [`public/branding/logo-square-512.png`](/home/aboelsoud/WebstormProjects/devnotes/public/branding/logo-square-512.png)
- [`public/branding/logo-square-144.png`](/home/aboelsoud/WebstormProjects/devnotes/public/branding/logo-square-144.png)
- [`public/branding/logo-square-128.png`](/home/aboelsoud/WebstormProjects/devnotes/public/branding/logo-square-128.png)

## Color Direction

The previous system used a purple-centered brand palette.

Confirmed inherited colors from the previous system:

- dark primary: `#9767b7`
- dark secondary: `#d59fe4`
- dark tertiary: `#985398`
- dark quaternary: `#5d3ca7`

- light primary: `#a772cb`
- light secondary: `#ecb0fd`
- light tertiary: `#a95ca9`
- light quaternary: `#6743b9`

Confirmed inherited shell/background colors:

- dark app background: `#1d1d1d`
- dark app foreground: `#242424`
- light app background: `#f9f9f9`
- light app foreground: `#ffffff`

## Manifest-Level Brand Signal

The previous system's app manifest used:

- theme color: `#9767b7`
- background color: `#242424`

These should be treated as the current inherited brand defaults unless deliberately changed.

## Typography Reference

The previous system used:

- body font: `Nunito Sans`
- heading font: `Montserrat`

These are references, not locked decisions for the new system.

## Current Direction

- Keep the inherited logo family.
- Keep the inherited purple brand family as the starting point.
- The purple family may be tuned, but it should remain recognizably connected to the previous system.
- Re-express the brand as a cleaner token system in the new application rather than copying the old theme system directly.
- Preserve visual continuity without carrying over the old frontend architecture.

## Display Direction

- The product should feel dark-first.
- The system should support both dark and light modes properly from the beginning.
- The wide logo should remain the primary logo for the main app shell.
- The square logo should remain the mark for app icons and related compact placements.

## Visual Character

The intended visual tone is:

- modern
- smart
- cutting edge
- easy to use
- pleasurable to look at
- flat
- simple
- spacious

This should guide the new design system more than the older app's implementation details.

## Flexible Areas

- Typography is not a strong preference right now and can be chosen pragmatically.
- Exact color tuning can evolve as long as the inherited brand family remains recognizable.

## Open Branding Questions

- What exact token set should define the new dark and light themes?
- What typography pair best fits the intended tone while staying practical for a dense operator-style UI?
- Should public-facing CMS surfaces share the exact same visual system as the owner OS, or should they feel related but not identical?
