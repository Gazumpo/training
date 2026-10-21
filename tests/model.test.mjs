import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLevels, validateLevels, rideDistance, weightLabel, selectedExercises, prehabExercises, exercisePrescription } from '../public/model.js';
import { EXERCISES, DAYS, SESSIONS, WORKLOADS, ENDURANCE, SLOTS, PREHAB } from '../public/data.js';
import { exerciseDiagram } from '../public/diagrams.js';
import { BASE_LEVELS } from '../public/base-levels.js';

test('fresh setup uses the repository cycling benchmark and working weights', () => {
  const levels = defaultLevels();
  assert.deepEqual(levels.rides, BASE_LEVELS.rides);
  assert.deepEqual(levels.weights, BASE_LEVELS.weights);
  assert.deepEqual(Object.keys(levels.weights).sort(), EXERCISES.filter(exercise => exercise.weight).map(exercise => exercise.id).sort());
  assert.equal(rideDistance(levels, 'easy'), 30);
  assert.equal(rideDistance(levels, 'interval'), 45);
  assert.equal(rideDistance(levels, 'long'), 60);
  assert.ok(Object.values(levels.weights).every(weight => weight === 0));
  assert.equal(weightLabel(levels, EXERCISES[0]), 'Bodyweight / no load');
});

test('saved edits and intentional blanks override the baseline without changing it', () => {
  const baseline = structuredClone(BASE_LEVELS);
  const edited = defaultLevels();
  edited.rides.benchmark = '';
  edited.weights.rdl = 17.5;
  edited.weights['bench-press'] = '';
  edited.weights['pull-up'] = 0;
  edited.workload = 'lighter';
  const restored = validateLevels(JSON.parse(JSON.stringify(edited)));
  assert.deepEqual(restored, edited);
  assert.equal(rideDistance(restored, 'long'), null);
  assert.equal(weightLabel(restored, EXERCISES.find(exercise => exercise.id === 'bench-press')), 'Set your weight');
  assert.deepEqual(BASE_LEVELS, baseline);
  assert.deepEqual(defaultLevels().rides, baseline.rides);
  assert.deepEqual(defaultLevels().weights, baseline.weights);

  // Existing sparse backups retain their unset weights instead of acquiring defaults.
  restored.weights = {};
  assert.deepEqual(validateLevels(restored), restored);
});

test('workload choices preserve entered ride distances and weights', () => {
  const levels = defaultLevels();
  levels.rides.benchmark = 47.5;
  levels.weights.rdl = 17.5;
  for (const workload of Object.keys(WORKLOADS)) {
    levels.workload = workload;
    const before = structuredClone(levels);
    assert.equal(rideDistance(levels, 'easy'), 23.8);
    assert.equal(rideDistance(levels, 'interval'), 35.6);
    assert.equal(rideDistance(levels, 'long'), 47.5);
    assert.deepEqual(levels, before);
  }
});

test('backup round-trips weights, alternatives, workload and one endurance mode', () => {
  const levels = defaultLevels();
  levels.rides.benchmark = 40;
  levels.weights = { rdl: 20, 'pull-up': 0, 'bench-press': 12.5 };
  levels.workout.pull = 'pull-up';
  levels.workout.core = 'bird-dog';
  levels.workout.trunk = 'reverse-crunch';
  levels.weights['external-rotation'] = 1.5;
  levels.endurance = 'kilter';
  levels.workload = 'lighter';
  assert.deepEqual(validateLevels(JSON.parse(JSON.stringify(levels))), levels);
  assert.equal(selectedExercises(levels).length, 7);
  assert.equal(selectedExercises(levels)[4].id, 'pull-up');
  assert.equal(weightLabel(levels, EXERCISES.find(item => item.id === 'bench-press')), '12.5 kg / dumbbell');
  assert.equal(weightLabel(levels, EXERCISES.find(item => item.id === 'pull-up')), 'Bodyweight / no load');
});

test('legacy numbered phases migrate without losing personal levels', () => {
  for (const [phase, workload] of ['normal', 'harder', 'lighter'].entries()) {
    const legacy = defaultLevels();
    delete legacy.workload;
    legacy.phase = phase;
    legacy.rides = { easy: 20, interval: 32.5, long: 47.5 };
    legacy.weights.rdl = 20;
    legacy.workout.core = 'bird-dog';
    const migrated = validateLevels(JSON.parse(JSON.stringify(legacy)));
    assert.equal(migrated.workload, workload);
    assert.equal(migrated.rides.benchmark, 47.5);
    assert.deepEqual(migrated.weights, legacy.weights);
    assert.deepEqual(migrated.workout, legacy.workout);
    assert.ok(!Object.hasOwn(migrated, 'phase'));
    assert.deepEqual(validateLevels(migrated), migrated);
  }
  const legacy = defaultLevels();
  delete legacy.workload;
  for (const phase of [undefined, -1, 3, '1', 1.5]) assert.throws(() => validateLevels({ ...legacy, phase }));
});

test('imports reject invalid numbers and mismatched exercise slots before accepting data', () => {
  for (const value of [-1, NaN, Infinity, '10', null, {}, 1001]) {
    const input = defaultLevels(); input.rides.benchmark = value;
    assert.throws(() => validateLevels(input));
  }
  const input = defaultLevels(); input.workout.leg = 'pull-up';
  assert.throws(() => validateLevels(input));
  for (const change of [{ version: 2 }, { workload: 'unknown' }, { workload: '__proto__' }, { workload: null }, { workload: ['normal'] }, { endurance: 'both' }, { format: 'other' }]) assert.throws(() => validateLevels({ ...defaultLevels(), ...change }));
});

test('weekly template has eight activities, one Wednesday option and separate Tuesday workouts', () => {
  assert.equal(DAYS.length, 7);
  assert.equal(DAYS.flatMap(day => day.sessions).length, 8);
  assert.deepEqual(DAYS[1].sessions, ['easy-ride', 'gym']);
  assert.deepEqual(DAYS[2].sessions, ['endurance']);
  assert.equal(DAYS.flatMap(day => day.sessions).filter(id => SESSIONS[id].category === 'bouldering').length, 3);
  assert.equal(DAYS.flatMap(day => day.sessions).filter(id => SESSIONS[id].category === 'cycling').length, 3);
  assert.deepEqual(DAYS[6].sessions, ['rest']);
  for (const workload of Object.keys(WORKLOADS)) {
    for (const session of Object.values(SESSIONS)) assert.equal(typeof session.durations[workload], 'string');
    for (const mode of Object.values(ENDURANCE)) assert.equal(typeof mode.doses[workload], 'string');
    assert.equal(typeof SESSIONS.intervals.efforts[workload], 'string');
  }
  assert.equal(WORKLOADS.lighter.sets, 1);
  assert.equal(WORKLOADS.normal.sets, 2);
  assert.equal(WORKLOADS.harder.sets, 2);
});

test('every library exercise has a valid slot, practical instructions and a movement diagram', () => {
  assert.equal(new Set(EXERCISES.map(item => item.id)).size, EXERCISES.length);
  for (const exercise of EXERCISES) {
    assert.ok(SLOTS.some(slot => slot.id === exercise.slot) || (exercise.slot === null && [...PREHAB.exercises, ...PREHAB.optional].includes(exercise.id)));
    assert.ok(exercise.steps.length >= 3);
    assert.ok(exercise.tips.length >= 2);
    const svg = exerciseDiagram(exercise.diagram, exercise.name);
    assert.ok(svg.includes('START') && svg.includes('FINISH'));
    assert.ok(!svg.includes('undefined'));
  }
});

test('original six-slot backups migrate without losing rides, weights or exercise choices', () => {
  const legacy = defaultLevels();
  delete legacy.workout.trunk;
  legacy.workout.core = 'dead-bug';
  legacy.workout.pull = 'pull-up';
  legacy.weights = { 'pull-up': 5, rdl: 20 };
  legacy.rides = { easy: 20, interval: 30, long: 50 };
  const migrated = validateLevels(legacy);
  assert.equal(migrated.workout.core, 'side-plank');
  assert.equal(migrated.workout.trunk, 'dead-bug');
  assert.equal(migrated.workout.pull, 'pull-up');
  assert.deepEqual(migrated.weights, legacy.weights);
  assert.deepEqual(migrated.rides, { benchmark: 50 });
  assert.deepEqual(validateLevels(migrated), migrated);
  legacy.workout.core = 'suitcase-carry';
  assert.equal(validateLevels(legacy).workout.core, 'suitcase-carry');
  for (const value of [null, 'row', 'unknown', 'external-rotation']) {
    assert.throws(() => validateLevels({ ...migrated, workout: { ...migrated.workout, trunk: value } }));
  }
});

test('main work, optional extras and scheduled shoulder care remain distinct', () => {
  const levels = defaultLevels();
  assert.deepEqual(selectedExercises(levels, 'main').map(item => item.id), ['split-squat', 'rdl', 'bench-press', 'side-plank', 'hanging-leg-raise']);
  assert.deepEqual(selectedExercises(levels, 'optional').map(item => item.id), ['calf-raise', 'row']);
  assert.deepEqual(prehabExercises().map(item => item.id), PREHAB.exercises);
  assert.ok(!prehabExercises().some(item => item.id === 'wrist-extension'));
  assert.deepEqual(PREHAB.sessions, ['gym', 'technique']);
  const find = id => EXERCISES.find(item => item.id === id);
  assert.deepEqual(exercisePrescription(find('rdl'), 'normal'), { sets: 2, rest: '2-3 min' });
  assert.deepEqual(exercisePrescription(find('external-rotation'), 'lighter'), { sets: 1, rest: '45-60 sec' });
  assert.deepEqual(exercisePrescription(find('wrist-extension'), 'normal'), { sets: 1, rest: '45-60 sec' });
});


test('one benchmark drives every cycling session and clearing it restores the default guides', () => {
  const levels = defaultLevels();
  for (const base of [40, 60]) {
    levels.rides.benchmark = base;
    for (const session of Object.values(SESSIONS).filter(item => item.category === 'cycling')) {
      const expected = { easy: base / 2, interval: base * 0.75, long: base };
      assert.equal(rideDistance(levels, session.rideKey), expected[session.rideKey]);
    }
  }
  for (const base of ['', 0]) {
    levels.rides.benchmark = base;
    for (const key of ['easy', 'interval', 'long']) assert.equal(rideDistance(levels, key), null);
  }
});

test('older ride fields consolidate with predictable fallbacks and strict number validation', () => {
  for (const [rides, benchmark] of [
    [{ long: 50, easy: 20, interval: 30 }, 50],
    [{ long: '', easy: 20, interval: 30 }, 20],
    [{ long: 0, easy: '', interval: 30 }, 30],
    [{ long: '', easy: '', interval: '' }, ''],
    [{ long: 0, easy: 0, interval: 0 }, ''],
  ]) {
    const migrated = validateLevels({ ...defaultLevels(), rides });
    assert.deepEqual(migrated.rides, { benchmark });
    assert.deepEqual(validateLevels(migrated), migrated);
  }
  for (const key of ['long', 'easy', 'interval']) {
    for (const value of [-1, '30', null, 1001]) {
      const rides = { long: 50, easy: 20, interval: 30, [key]: value };
      assert.throws(() => validateLevels({ ...defaultLevels(), rides }));
    }
  }
});


test('retired floor-press setups migrate without resetting other choices or accepting invalid loads', () => {
  const legacy = defaultLevels();
  legacy.workout.push = 'floor-press';
  legacy.workout.leg = 'goblet-squat';
  legacy.weights = { 'floor-press': 12.5, rdl: 20 };
  const migrated = validateLevels(legacy);
  assert.equal(migrated.workout.push, 'bench-press');
  assert.equal(migrated.workout.leg, 'goblet-squat');
  assert.deepEqual(migrated.weights, { 'bench-press': 12.5, rdl: 20 });
  assert.deepEqual(validateLevels(migrated), migrated);
  assert.equal(legacy.workout.push, 'floor-press');
  legacy.weights['bench-press'] = 10;
  assert.equal(validateLevels(legacy).weights['bench-press'], 10);
  delete legacy.weights['bench-press'];
  legacy.workout.push = 'push-up';
  assert.equal(validateLevels(legacy).workout.push, 'push-up');
  for (const value of [-1, '12.5', null, 501]) {
    legacy.weights['floor-press'] = value;
    assert.throws(() => validateLevels(legacy));
  }
});
