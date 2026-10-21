# Training

A buildless training companion. This checkout now includes an internal exercise-photo preview, with real photo sequences for all 21 exercises. Keep this version local/internal as requested. Some photo-reference rights are unconfirmed; do not deploy or redistribute these assets as a publicly reusable library. No package installation, framework, backend or subscription is needed.

The current gym prescription and its evidence limits are explained in [exercise-review.md](exercise-review.md).

## Local preview

From this directory:

```sh
python3 -m http.server 8765 --directory public
```

Open `http://localhost:8765/`. The homepage link and parent service worker are available when serving the combined site instead.

## Files

- `public/data.js`: repeating weekly schedule, independent workload options, session guides, exercise library and workout slot definitions.
- `public/base-levels.js`: editable baseline cycling benchmark and exercise weights, with weight units beside each entry.
- `public/model.js`: current-level defaults, import validation, weight labels and ride distance display.
- `public/app.js`: calendar, expandable activity details, library, personal levels and export/import.
- `public/diagrams.js`: original vector movement diagrams.
- `public/media.js`: captioned photo sequences, intrinsic image sizes and source links for every exercise.
- `public/media/`: local photos, selected demonstration clips, and a source/rights record in `SOURCES.md`.
- `public/styles.css`: responsive design, keyboard focus and reduced-motion support.

## Behaviour

- No fixed dates, automatic rollover, workout history, checkboxes, charts or notifications.
- One repeatable weekly plan with Normal, Lighter and Harder workload options. Choose any option at any time; there are no numbered weeks, cycles or automatic progression.
- The repository baseline cycling benchmark is 60 km and represents a comfortable long ride. Easy, interval and long ride distance guides use 50%, 75% and 100% of it (initially 30, 45 and 60 km), with shorter distances rounded to one decimal place. Time and effort guidance still apply. These ratios stay the same across workloads, and there is no automatic progression. Older three-distance setups and backups use their saved long ride as the benchmark, falling back to a positive easy ride or interval distance when needed.
- Baseline weights are 0 kg for every loadable exercise, ready to edit. They remain unchanged between workloads, and indicate per-dumbbell, total-held or added-bodyweight units. Lighter reduces each exercise to one set.
- Tuesday has five main exercises: split squat, Romanian deadlift, dumbbell bench press, side plank and hanging knee / leg raise. Dead bugs and bird dogs remain easier library alternatives. The hanging raise starts at 2 × 6-10 controlled reps, or one set with Lighter; use reverse crunches if grip or shoulders limit it. Two further slots retain optional calf and pulling choices. Slot exercises can be changed in the library. The press and optional hand-and-knee-supported row use a stable flat bench; push-ups are the equipment-free pressing alternative. The bench also provides an incline push-up/scapular push-up regression and forearm support for optional wrist extensions. Goblet squats are an alternative to split squats, with unloaded practice and gradual loading guidance.
- Shoulder care follows Tuesday strength and Friday climbing: side-lying external rotation and scapular push-ups. Start with one set, build to two when recovered, and use one with Lighter. Supported wrist extension is available as optional capacity work, not a scheduled requirement or generic elbow treatment.
- Exercise-specific rests allow 2-3 minutes for loaded leg work. Progress a small amount after reaching the top of the rep range with 2-3 reps in reserve on two sessions. Strength plus shoulder care takes about 40-50 minutes, or 25-35 with Lighter; optional extras add time. The app never changes saved loads automatically.
- Current levels, workout selection, workload and one Wednesday endurance choice are stored under `pickledonion.training.v1` in localStorage. No server receives them. They are specific to the browser and origin. Export/import transfers this setup between devices. Import replaces the current setup after validation.
- A new browser, cleared storage or an unreadable saved setup uses `public/base-levels.js`. An existing valid saved setup takes precedence in full, including deliberately blank fields and unset weights. Editing the baseline file does not reset saved setups. Edit numbers in that file to update the fallback; use `''` for unset values and `0` for no added load. Site edits save in the browser and do not rewrite the repository file. Export levels to keep a backup of later changes.
- Saved floor-press selections, weights and exercise links migrate to bench press. Reassess the old load for the greater range of motion.
- Existing saved setups and version 1 backups with numbered phases migrate to the corresponding workload while retaining personal levels and exercise choices. Six-slot backups gain an abdominal-control slot. A previously selected dead bug moves into that slot, with side plank filling the other core slot.
- Invalid imports leave the current state unchanged. If storage fails, the page continues for that visit and advises exporting levels.
- Uses system fonts, compact controls, activity colours and a calendar-first layout. All 21 exercises have real photos and short position-specific captions. Seven also have optional demonstration clips, loaded only when requested. Static holds use setup/hold photos rather than an invented rep sequence. Two-photo references repeat the actual starting pose for the return caption. Original SVG diagrams remain available as a fallback for future exercises without media. Open `/#exercise-split-squat`, `/#exercise-dead-bug` or any exercise ID directly. Videos pause when their card/clip is closed or the tab changes. Assets are local, with source links alongside each demonstration and provenance in `public/media/SOURCES.md`.

## Main-site integration

The canonical `/Users/graeme/Projects/build-pickledonion-dev.sh` copies only `training/public/` into `/training/`. The canonical homepage uses a Training entry in `pickled-onion/links.js`. Its service worker includes the Training assets and uses network-first updates for them.

Do not edit the generated `pickledonion.dev/` directory directly. The current internal photo preview must not be copied into public deployment output. The `noindex` metadata is a crawler request, not access control. Continue to serve this checkout on localhost, or use authenticated hosting if it is later made available on a network. Do not deploy unless explicitly requested.

## Verification

With Node.js 22+:

```sh
node --test tests/model.test.mjs
node --test tests/media.test.mjs
node --check public/app.js
```

Browser checks: desktop and narrow phone layouts; expand each session; switch Wednesday mode; change workloads; set weights and the cycling benchmark, then reload; change workout selections; filter/search library; export/import a backup; reject an invalid backup; navigate tabs with arrow keys and close the levels dialog with Escape.

The original dated brief is retained in `climbing_cycling_codex_brief.md` as background. The implemented requirements follow the later conversation: repeatable schedule, equipment-based library, current values only and no history or reminders.
