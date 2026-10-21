import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { EXERCISES } from '../public/data.js';
import { EXERCISE_MEDIA } from '../public/media.js';

test('every library exercise has a complete captioned photo sequence', () => {
  assert.deepEqual(Object.keys(EXERCISE_MEDIA).sort(), EXERCISES.map(exercise => exercise.id).sort());
  for (const exercise of EXERCISES) {
    const media = EXERCISE_MEDIA[exercise.id];
    assert.ok(media.frames.length >= 2, exercise.id);
    assert.ok(media.heading && media.note && media.sourceName && media.rights, exercise.id);
    assert.equal(new URL(media.sourceUrl).protocol, 'https:');
    for (const frame of media.frames) {
      assert.ok(frame.label && frame.cue && frame.width > 0 && frame.height > 0, exercise.id);
    }
  }
});

test('all referenced photos and clips are present as local media files', () => {
  for (const [id, media] of Object.entries(EXERCISE_MEDIA)) {
    for (const frame of media.frames) {
      assert.match(frame.file, /^[a-z0-9-]+\.webp$/);
      const bytes = readFileSync(new URL(`../public/media/${id}/${frame.file}`, import.meta.url));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${id}/${frame.file}`);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${id}/${frame.file}`);
    }
    if (media.video) {
      assert.equal(media.video, 'demo.mp4');
      assert.ok(statSync(new URL(`../public/media/${id}/${media.video}`, import.meta.url)).size > 0, id);
    }
  }
});
