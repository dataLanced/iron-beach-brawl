# Brief for a new 2D brawler (lessons from Iron Beach Brawl)

Attach this file at the start of the new project. It is written for Claude: what the user wants, how they work, the
design rules already settled, and the technical mistakes not to repeat. The old project lives at
github.com/dataLanced/iron-beach-brawl (read it for reference code; do not copy its structure).

## 1. Working with the user
- Mostly on a phone. Keep replies scannable; always SEND the files they need (templates, refs, screenshots) next to
  the prompts so they never scroll back. Put every prompt in a code block.
- Deploy after every change (playable link) and show a screenshot of the result. They test on iPhone in portrait and
  landscape.
- They think in Streets of Rage / Fight'N Rage / Absolum terms. Characters are adult women fighters, heavily
  muscled, anime game-sprite style. Adults only, always.
- They brainstorm out loud in long voice messages: restate the rules back as a short list, ask only what changes the
  build, then build.
- Be honest about anatomy, scale and anything left unfinished.

## 2. Art pipeline (ChatGPT sheets + Seedance clips)
### Standing prompt rules (verbatim, every image prompt)
- Start: `TRANSPARENT BACKGROUND. No glow, no shadow, no white outline. The background must be fully transparent, NOT black.`
- End: `Please make these in a way that is suitable with your image restriction guidelines. And if you have a problem with it, please adjust the image.`
- Back views: say "rear three-quarter / turned away, over-the-shoulder" (plain "from behind" gets refused or drawn
  front-on).
- After a refusal, use a fresh ChatGPT chat.
- Style line + style reference image for every new design (clean anime game-sprite art, thin dark-brown outlines,
  soft cel shading, head ~1/4 of height, very muscular, wide stance). Old pixel-crunch look is retired.

### Templates
- 1536x1024 (ChatGPT's native size), grid of boxes (6 = 3x2 or 10 = 5x2), dashed yellow head line at 22% of box
  height and a floor line at 88%, box numbers, and the character's stance pasted into box 1 as the scale anchor.
  Figure only ~2/3 of the box so kicks/hair/lying poses fit.
- Ask for one pose per box, facing RIGHT, feet on the floor line, nothing crossing boxes, guides removed.
- Name poses that worked (pose library with a reference cut-out + a prompt line) so they can be reused per character.

### Seedance (motion: walks, idles, uppercuts, spins)
- Green padded start frame (character on flat green), same stance as start AND end frame, 4-second clips.
- Camera wording: "Locked-off camera on a tripod: no zoom, no pan, no tracking, the camera never moves."
- Seedance struggles with turning kicks (zooms, kicks backwards, wrong foot) - a backwards clip can be mirrored into
  a different move. Content filters differ by host: Seedance 2.5 on Luno passed clips Venice blocked.
- Key the green, then pick 3-7 frames per move.

### Cutting and packing
- Cut by watershed per grid cell (seed from eroded figure pixels, never let a seed span two cells, reassign stray
  bits to the figure they touch). Clean template guide lines only OUTSIDE the body.
- Normalise every sheet by ITS OWN box-1 stance height (measure height, never width) to one in-game stance height.
  Keep a FIX table for single frames drawn at a different zoom and a MIRROR table for frames drawn facing left.
- Anchor: feet centre on the floor for grounded frames; frame centre (or a named point, e.g. hands) for airborne.
- Check every new frame on a common baseline next to the stance before shipping; oversized victory/special frames are
  the usual bug.
- Ship sprites as separate WebP files (not base64 in the page); atlases capped at 4096 px wide.

## 3. Architecture: do this from day one
The old game grew by concatenating ~40 scripts and re-wrapping global functions (`damage = function(){...}` five
layers deep). It works but every feature is a patch. Instead:
- Modules (ES modules + a tiny bundler, or Godot later). One `Fighter` entity used by players AND NPCs, with a data
  state machine. Moves are DATA: frames, ms per frame, hitbox per frame, damage/knockback/stun/flags (big, knock,
  launch, low, guardCrush, unblockable), cancel windows, sounds.
- ONE combat pipeline with ordered hooks: `resolveHit(attacker, target, hit)` -> invulnerable? parry? guard? armor?
  counter? -> apply -> reactions. Same for grabs: `tryGrab` -> lock rules -> throw timeline -> landing.
- Fixed timestep (60 Hz) + seeded RNG: replays and scripted tests become trivial (we added replays late).
- Input layer: buffered presses (~150 ms), simultaneous-press detection (two buttons within ~120 ms), double-tap
  detection, edge-triggered taps. Touch, keyboard and gamepad all feed the same input state.
- Renderer separate from simulation; render inside try/catch per entity so one bad frame never freezes the game.
- Debug overlay from the start: hitboxes, state names, frame index, AI mode.
- Headless test harness (Playwright) from the start: scripted inputs -> assert state sequence / damage. Every move
  and every grab gets a test.
- A CLAUDE.md in the repo describing the systems, kept current.

## 4. Pitfalls we actually hit
- Canvas `ellipse` with a negative radius throws and froze the game (effects with t<0). Clamp radii.
- `undefined <= 0` is false: always default numbers (`!(h.z > 0)`).
- Invulnerability flicker hid the player during her own specials - don't flicker during owned move states.
- KO'd bodies kept `rot` from a throw and stood upright - reset rot/spin on every state change into down/ko.
- "Grabbable" only accepted state `idle`, so walking/stepping enemies couldn't be grabbed. Grab on contact.
- Knockdown rules differed between modes (watch mode vs play). One reaction system for everyone.
- sed/regex edits that swallowed code behind a `//` comment. Edit with real tools, then run the tests.
- Multi-row atlas packing broke the build; keep one packer.
- Phone layout: CSS `aspect-ratio` + `max-height` squashed the canvas. Lock the stage to a true 16:9 by width calc.

## 5. Design rules already settled (reuse them)
### Defense - two SEPARATE risk/reward tools
- PARRY: tap toward the attacker just as the hit lands (~0.18 s window), only from neutral, never from guard.
  Success: no damage, attacker stunned, meter gain. Miss: you walked into the string.
- GUARD (hold button): front only, can't walk (can turn, dodge, attack or jump out). Guard meter drained per blocked
  hit by attacker tier (grunts barely; named fighters hard; heavies more). Empty = GUARD BREAK -> arms open -> dizzy.
  Hit from behind while guarding = COUNTER (x1.5 damage, longer stun).
  Grabbed while guarding: no mash-out, no meter escape, no tech/land-on-feet; extra damage on every throw/slam,
  more if grabbed from behind.
- AI reads guarding (habit score rising while guarding, fading while attacking): grunts flank to the back, grapplers
  grab more, named fighters stop strings after 2 blocked hits and poke/grab, and pick heavier attacks.
- Lane dodge: double-tap up/down, one lane only. Tech roll: jump as you hit the floor (not after a guard grab).
- Not used: clash and deflect (cut by the user).

### Specials and meter (SOR4-style)
- Specials on punch+jump (+direction): burst (also escapes hits/holds), forward rush, up uppercut. Kick+jump = star
  super (limited stars). Full meter pays; otherwise costs health shown as a recoverable sliver, won back by landing
  hits before you're hit. Dedicated S button on touch for kick+jump.

### Grabs
- Walk into a foe to grab. Locks: grabbed from behind, while dizzy, after 3 squeezes, or while guarding. Escape by
  mashing with diminishing returns per squeeze.
- Throw menu by direction (+ jump to vault behind, then rear options). Thrown bodies bowl others over.
- Grab polish rules (planned): contact points per frame, front-arm layer over the victim, victim poses matching the
  throw, damage/hit-stop on the exact impact frame, a tuner page to align offsets.

### Enemy structure
- Tiers (grunt colours -> named fighters -> bosses) with hp, speed, windup, cooldown range, grab chance, stun resist.
- AI modes: press vs circle, a cap on how many press at once, flankers walk round to the back, taunts at range.
- Named fighters have their own kits, guards (NPC block with their own meter), overdrive/enrage phases.
- Watch mode (AI vs AI) is a great balance tool; replays are a great bug-report tool.

### Hit feel
- Hit-stop scaled by hit size, screen shake, sparks, damage numbers, dust on landings, OTG hits on downed foes,
  dizzy meter from rapid damage. Plan a unified pass early (stun, cancels, buffering, combo cap + damage scaling).

## 6. Mobile
- Stage always true 16:9. Portrait: controls under the screen, sized by vw. Landscape: stage full height, controls
  semi-transparent over the lower corners, safe-area insets. Buttons: d-pad, Jump, Kick, Punch, S (special),
  G (guard, hold), Title.
