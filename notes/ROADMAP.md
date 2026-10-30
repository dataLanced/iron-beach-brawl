# Roadmap (agreed with the user)

## Done (Oct 30)
- Scarlett full player kit (strings, runs, jumps, 10 grabs incl. vault, specials, meter, parry, dodge, tech roll,
  intro / taunt / victories) and her guard (hold G: meter, break, counters from behind, locked guard-grabs).
- Enemies vs guard: grunts flank, grapplers grab more, named fighters cut strings short and favour heavies.
- Mobile layout (true 16:9, overlay controls in landscape), S (kick + jump) and G (guard) buttons.
- Clash and deflect removed by request; dodge = one lane.

## Open
- Guard-aware grab/heavy choices for the rest of the named cast (Satsuki, Nurse, Vex, ...); only Mika and the
  twin-tails choose differently so far (the rest drain the guard harder once they've read it).
- Optional: a stronger heavy-block frame (box 4 of the guard sheet, skidding back further).

## Next: GRAB POLISH PASS (user approved)
1. Contact points per grab frame (grabber hands) and per victim pose (neck / waist / shoulders); victim snapped so
   they line up every frame.
2. Layering: near arm cut out of grab frames into its own layer -> grabber body, victim, front arm.
3. Victim poses that match the throw (lifted, upside down, impact) from each character's airborne / flat frames,
   squash on impact.
4. Impact timing: hit-stop, shake, dust, damage on the exact contact frame.
5. Grab tuner page in the previewer: pick grabber + victim, step frame by frame, drag to align, save offsets.
Order: Scarlett first (built this way), then twin-tails, kunoichi, Vex, Nurse, Metallic 2, Sumo, then the rest.

## Later
- Redraws: Goldie (design approved, refs/goldie_v2*), Sunny (design approved, refs/sunny_v2*), Scout (beefier kick frames).
- Hit-feel pass (hit-stop / stun / cancels / buffering unified), combo cap + damage scaling on enemies.
- Handoff: src/ + CLAUDE.md backup.
- Godot port: only once core systems are locked.
