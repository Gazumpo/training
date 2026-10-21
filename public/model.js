import { EXERCISES, SLOTS, WORKLOADS, PREHAB } from './data.js?v=core-review-20261021';
import { BASE_LEVELS } from './base-levels.js?v=base-levels-20261021';

export const STORAGE_KEY = 'pickledonion.training.v1';
function emptyLevels() {
  return { format: 'pickledonion-training', version: 1, rides: { benchmark: '' }, weights: {}, workout: Object.fromEntries(SLOTS.map(slot => [slot.id, slot.default])), endurance: 'circuits', workload: 'normal' };
}

export function defaultLevels() {
  return validateLevels({ ...emptyLevels(), rides: BASE_LEVELS.rides, weights: BASE_LEVELS.weights });
}

function numberOrBlank(value, max) {
  if (value === '') return '';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error('Distances and weights must be valid, non-negative numbers.');
  return value;
}

export function validateLevels(input) {
  if (!input || typeof input !== 'object' || input.format !== 'pickledonion-training' || input.version !== 1) throw new Error('Choose a Training levels export (version 1).');
  // Imports and saved setups replace the baseline, including intentional blanks.
  const result = emptyLevels();
  if (!input.rides || !input.weights || !input.workout) throw new Error('This levels file is incomplete.');
  if (Object.hasOwn(input.rides, 'benchmark')) {
    result.rides.benchmark = numberOrBlank(input.rides.benchmark, 1000);
  } else {
    // Consolidate older setups, preferring their comfortable long ride.
    const distances = ['long', 'easy', 'interval'].map(key => numberOrBlank(input.rides[key], 1000));
    result.rides.benchmark = distances.find(value => value !== '' && value > 0) ?? '';
  }
  // Retired floor-press selections and loads follow the replacement exercise.
  const weights = { ...input.weights };
  if (!Object.hasOwn(weights, 'bench-press') && Object.hasOwn(weights, 'floor-press')) weights['bench-press'] = weights['floor-press'];
  for (const exercise of EXERCISES) {
    if (exercise.weight && Object.hasOwn(weights, exercise.id)) result.weights[exercise.id] = numberOrBlank(weights[exercise.id], 500);
  }
  for (const slot of SLOTS) {
    // Original setups had one core slot. Keep saved choices and add the new one.
    if (slot.id === 'trunk' && !Object.hasOwn(input.workout, 'trunk')) {
      if (input.workout.core === 'dead-bug') result.workout.trunk = 'dead-bug';
      continue;
    }
    if (slot.id === 'core' && input.workout.core === 'dead-bug' && !Object.hasOwn(input.workout, 'trunk')) continue;
    const savedId = input.workout[slot.id] === 'floor-press' ? 'bench-press' : input.workout[slot.id];
    const exercise = EXERCISES.find(item => item.id === savedId);
    if (!exercise || exercise.slot !== slot.id) throw new Error('This file contains an invalid workout selection.');
    result.workout[slot.id] = exercise.id;
  }
  if (!['circuits', 'kilter'].includes(input.endurance)) throw new Error('This file contains an invalid endurance option.');
  // Older backups used numbered phases. Preserve their selected volume on import.
  let workload = input.workload;
  if (workload === undefined && Number.isInteger(input.phase)) workload = ['normal', 'harder', 'lighter'][input.phase];
  if (typeof workload !== 'string' || !Object.hasOwn(WORKLOADS, workload)) throw new Error('This file contains an invalid workload.');
  result.endurance = input.endurance;
  result.workload = workload;
  return result;
}

export function rideDistance(levels, key) {
  const base = levels.rides.benchmark;
  const factors = { easy: 0.5, interval: 0.75, long: 1 };
  if (base === '' || base === 0 || !Object.hasOwn(factors, key)) return null;
  return key === 'long' ? base : Math.round(base * factors[key] * 10) / 10;
}

export function weightLabel(levels, exercise) {
  if (!exercise.weight) return 'Bodyweight';
  const value = levels.weights[exercise.id];
  if (value === undefined || value === '') return 'Set your weight';
  if (value === 0) return 'Bodyweight / no load';
  const suffix = exercise.weight.includes('per dumbbell') ? 'kg / dumbbell' : exercise.id === 'pull-up' ? 'kg added' : 'kg';
  return `${value} ${suffix}`;
}

export function selectedExercises(levels, scope = 'all') {
  return SLOTS.filter(slot => scope === 'main' ? !slot.optional : scope === 'optional' ? slot.optional : true)
    .map(slot => EXERCISES.find(exercise => exercise.id === levels.workout[slot.id]));
}

export function prehabExercises() {
  return PREHAB.exercises.map(id => EXERCISES.find(exercise => exercise.id === id));
}

export function exercisePrescription(exercise, workload) {
  const sets = PREHAB.optional.includes(exercise.id) ? 1 : WORKLOADS[workload].sets;
  const rest = exercise.rest || (['leg', 'hinge'].includes(exercise.slot) ? '2-3 min' : '60-90 sec');
  return { sets, rest };
}
