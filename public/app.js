import { DAYS, SESSIONS, EXERCISES, SLOTS, WORKLOADS, ENDURANCE, PREHAB } from './data.js?v=core-review-20261021';
import { defaultLevels, validateLevels, STORAGE_KEY, rideDistance, weightLabel, selectedExercises, prehabExercises, exercisePrescription } from './model.js?v=core-review-20261021';
import { exerciseDiagram } from './diagrams.js?v=core-review-20261021';
import { EXERCISE_MEDIA } from './media.js?v=core-review-20261021';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const categoryNames = { bouldering: 'Bouldering', cycling: 'Cycling', strength: 'Strength', recovery: 'Recovery' };
let levels = defaultLevels();
let storageAvailable = true;
let loadWarning = '';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) levels = validateLevels(JSON.parse(saved));
} catch {
  loadWarning = 'Saved levels could not be loaded. Using baseline levels. You can still edit them or import a backup.';
}
let openSession = null;
let filter = 'all';
let query = '';
let toastTimer;

function notify(message) {
  $('#status').textContent = message;
  $('#status').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#status').classList.remove('visible'), 5500);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    storageAvailable = true;
    $('#storage-note').textContent = 'Saved in this browser.';
  } catch {
    storageAvailable = false;
    $('#storage-note').textContent = 'Browser saving unavailable. Export levels before leaving.';
    notify('Changes work for this visit. Browser storage is unavailable; export your levels to keep them.');
  }
}

function duration(session) {
  const distance = session.rideKey && rideDistance(levels, session.rideKey);
  if (session.rideKey === 'long' && distance !== null) return `About ${distance} km`;
  if (distance !== null && session.rideKey) return `${session.durations[levels.workload]} · about ${distance} km`;
  return session.durations[levels.workload];
}

function weightInput(exercise, prefix) {
  if (!exercise.weight) return '<p class="bodyweight-label">Bodyweight · no added load needed</p>';
  const value = levels.weights[exercise.id] ?? '';
  return `<label class="level-input" for="${prefix}-${exercise.id}"><span>Working weight <small>${exercise.weight}</small></span><span class="input-wrap"><input id="${prefix}-${exercise.id}" data-weight="${exercise.id}" type="number" min="0" max="500" step="any" inputmode="decimal" value="${value}" placeholder="Not set" aria-label="${escape(exercise.name)} working weight, ${exercise.weight}"><span>kg</span></span></label>`;
}

function exerciseVisual(exercise) {
  const media = EXERCISE_MEDIA[exercise.id];
  if (!media) return exerciseDiagram(exercise.diagram, exercise.name);
  const base = `./media/${exercise.id}/`;
  const frames = media.frames.map((frame, index) => `<figure><img src="${base}${frame.file}" width="${frame.width}" height="${frame.height}" loading="lazy" alt="${escape(exercise.name)}: ${escape(frame.cue)}"><figcaption><strong>${index + 1}. ${escape(frame.label)}</strong><span>${escape(frame.cue)}</span></figcaption></figure>`).join('');
  const video = media.video ? `<details class="movement-video"><summary>Watch the full movement</summary><video controls muted playsinline loop preload="none" poster="${base}${media.frames[0].file}" aria-label="${escape(exercise.name)} demonstration"><source src="${base}${media.video}" type="video/mp4">Your browser cannot play this clip. <a href="${base}${media.video}">Open the demonstration video</a>.</video></details>` : '';
  const disclaimer = media.rights === 'public-domain' ? '<p class="demo-credit">The appearance of U.S. Department of War (DoW) visual information does not imply or constitute DoW endorsement.</p>' : '';
  return `<section class="movement-demo${media.portrait ? ' portrait-demo' : ''}" aria-label="${escape(exercise.name)} photo demonstration"><h4>${escape(media.heading)}</h4><div class="movement-frames frames-${media.frames.length}">${frames}</div><p class="demo-note">${escape(media.note)}</p>${video}<p class="demo-credit">Photo reference: <a href="${escape(media.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(media.sourceName)}</a>.</p>${disclaimer}</section>`;
}

function exerciseBody(exercise, prefix) {
  const slot = SLOTS.find(item => item.id === exercise.slot);
  const selected = slot && levels.workout[exercise.slot] === exercise.id;
  const { sets, rest } = exercisePrescription(exercise, levels.workload);
  const action = slot ? `<button class="${selected ? 'selected-button' : 'secondary-button'}" data-select-exercise="${exercise.id}" ${selected ? 'disabled' : ''}>${selected ? (slot.optional ? 'Selected optional exercise' : 'Selected for Tuesday') : `Use for ${slot.name.toLowerCase()} slot`}</button>` : `<p class="small-print">${PREHAB.exercises.includes(exercise.id) ? 'Scheduled after Tuesday strength and Friday easy climbing. Start with one set in the first week.' : 'Optional capacity work. Not part of the scheduled shoulder routine.'}</p>`;
  return `<div class="exercise-body">${exerciseVisual(exercise)}<p class="movement-benefit">${exercise.benefit}</p><div class="dose-row"><strong>${sets} ${sets === 1 ? 'set' : 'sets'} × ${exercise.dose}</strong><span>Rest ${rest}</span></div>${weightInput(exercise, prefix)}<h4>How to do it</h4><ol class="instructions">${exercise.steps.map(step => `<li>${step}</li>`).join('')}</ol><div class="technique-tips"><h4>Keep in mind</h4><ul>${exercise.tips.map(tip => `<li>${tip}</li>`).join('')}</ul></div>${action}</div>`;
}

function exerciseRows(exercises, prefix) {
  return `<div class="gym-session-exercises">${exercises.map((exercise, index) => `<details class="workout-exercise"><summary><span class="exercise-index">${index+1}.</span><span><strong>${exercise.name}</strong><small>${exercisePrescription(exercise, levels.workload).sets} × ${exercise.dose}</small></span><span class="weight-tag" data-weight-label="${exercise.id}">${weightLabel(levels, exercise)}</span><span class="details-plus" aria-hidden="true">+</span></summary>${exerciseBody(exercise, prefix)}</details>`).join('')}</div>`;
}

function shoulderRoutine(id) {
  return `<section class="support-routine"><h4>Shoulder care · Tuesday and Friday</h4><p>${PREHAB.description}</p>${exerciseRows(prehabExercises(), `prehab-${id}`)}<p class="small-print">${PREHAB.guidance}</p></section>`;
}

function renderWorkloads() {
  $('#workload-options').innerHTML = Object.entries(WORKLOADS).map(([key, workload]) => `<button id="workload-${key}" aria-pressed="${levels.workload === key}" data-workload="${key}">${workload.name}<small>${workload.label}</small></button>`).join('');
  $('#workload-description').textContent = WORKLOADS[levels.workload].description;
}

function renderCalendar() {
  $('#calendar').innerHTML = DAYS.map((day, dayIndex) => `<section class="day" aria-labelledby="day-${dayIndex}"><h3 id="day-${dayIndex}">${day.name}</h3><div class="day-sessions">${day.sessions.map(id => {
    const session = SESSIONS[id];
    return `<button id="session-${id}" class="session-card ${session.category}${openSession === id ? ' is-open' : ''}" data-session="${id}" aria-expanded="${openSession === id}"${openSession === id ? ' aria-controls="session-detail"' : ''}><span class="category-label">${categoryNames[session.category]}</span><strong>${session.name}</strong><span class="session-meta" data-duration="${id}">${duration(session)}</span><span class="card-footer"><span>${id === 'gym' ? '5 main + shoulder care' : id === 'endurance' ? ENDURANCE[levels.endurance].doses[levels.workload] : session.intensity}</span><span class="expand-symbol" aria-hidden="true">${openSession === id ? '−' : '+'}</span></span></button>`;
  }).join('')}</div></section>${openSession && day.sessions.includes(openSession) ? sessionDetails(openSession) : ''}`).join('');
}

function sessionDetails(id) {
  const session = SESSIONS[id];
  const day = DAYS.find(item => item.sessions.includes(id));
  const endurance = ENDURANCE[levels.endurance];
  const extra = id === 'endurance' ? `<div class="endurance-options"><h4>Choose your mode</h4><div class="mode-buttons" role="group" aria-label="Endurance mode">${Object.entries(ENDURANCE).map(([key, mode]) => `<button data-mode="${key}" aria-pressed="${levels.endurance === key}" class="${levels.endurance === key ? 'active' : ''}">${mode.name}</button>`).join('')}</div><p class="effort-prescription">${endurance.doses[levels.workload]}</p><p>${endurance.detail}</p></div>` : id === 'intervals' ? `<div class="interval-prescription"><strong>${session.efforts[levels.workload]}</strong><span>4 min easy between efforts · RPE 7-8</span></div>` : '';
  return `<section id="session-detail" class="session-detail ${session.category}" aria-labelledby="detail-title"><div class="detail-heading"><div><p class="detail-category">${day.name} / ${categoryNames[session.category]}</p><h3 id="detail-title">${session.name}</h3><p class="detail-meta" data-duration="${id}">${duration(session)}</p></div><button class="secondary-button" data-close-session aria-label="Close ${session.name} details">Close</button></div><div class="detail-layout"><div><p class="detail-description">${session.description}</p><ol class="instructions">${session.steps.map(step => `<li>${step}</li>`).join('')}</ol>${extra}</div><aside class="detail-aside"><span class="intensity-badge">${session.intensity}</span><p>${session.tip}</p>${session.rideKey ? '<button class="text-button" data-settings>Set cycling benchmark</button>' : ''}</aside></div>${id === 'gym' ? `<h4>Main strength exercises</h4>${exerciseRows(selectedExercises(levels, 'main'), 'session')}${shoulderRoutine(id)}<section class="support-routine"><h4>Optional extras · only when recovered</h4><p>Calves are lower priority. Extra pulling is useful only if it addresses a weakness and you are fresh after Monday. Skip both when short on time or recovering poorly; allow extra time if included.</p>${exerciseRows(selectedExercises(levels, 'optional'), 'optional')}</section><button class="text-button library-link" data-open-library>Change exercises</button>` : PREHAB.sessions.includes(id) ? shoulderRoutine(id) : ''}</section>`;
}

function renderWorkoutStrip() {
  const exercises = [...selectedExercises(levels, 'main'), ...prehabExercises(), ...selectedExercises(levels, 'optional')];
  $('#workout-strip').innerHTML = exercises.map((exercise, index) => `<button data-show-exercise="${exercise.id}"><span class="strip-number">${index+1}.</span><strong>${exercise.name}${SLOTS.find(slot => slot.id === exercise.slot)?.optional ? ' (optional)' : ''}</strong><span data-weight-label="${exercise.id}">${weightLabel(levels, exercise)}</span></button>`).join('');
}

function renderWorkoutSelection() {
  $('#workout-selection').innerHTML = SLOTS.map(slot => `<label><span>${slot.name}</span><select data-slot="${slot.id}" aria-label="Tuesday ${slot.name} exercise">${EXERCISES.filter(exercise => exercise.slot === slot.id).map(exercise => `<option value="${exercise.id}"${levels.workout[slot.id] === exercise.id ? ' selected' : ''}>${exercise.name}</option>`).join('')}</select></label>`).join('');
}

function renderLibrary() {
  const matching = EXERCISES.filter(exercise => (filter === 'all' || exercise.group === filter) && `${exercise.name} ${exercise.equipment} ${exercise.benefit}`.toLowerCase().includes(query));
  $('#exercise-count').textContent = `${matching.length} exercise${matching.length === 1 ? '' : 's'}`;
  $('#exercise-library').innerHTML = matching.length ? matching.map(exercise => `<details class="exercise-card ${exercise.group}" id="exercise-${exercise.id}"><summary><span class="exercise-card-top"><span class="movement-group">${exercise.group}</span>${PREHAB.exercises.includes(exercise.id) ? '<span class="in-workout">Tue + Fri</span>' : levels.workout[exercise.slot] === exercise.id ? `<span class="in-workout">${SLOTS.find(slot => slot.id === exercise.slot).optional ? 'Optional' : 'Selected'}</span>` : ''}</span><span class="exercise-card-name">${exercise.name}</span><span class="equipment">${exercise.equipment}</span><span class="exercise-card-bottom"><span data-weight-label="${exercise.id}">${weightLabel(levels, exercise)}</span><span class="details-plus" aria-hidden="true">+</span></span></summary>${exerciseBody(exercise, 'library')}</details>`).join('') : '<p class="empty-state">No exercises match. Try another search or choose All.</p>';
}

function renderLevels() {
  $('#levels-fields').innerHTML = `<h3>On the bike</h3><label class="level-input" for="ride-benchmark"><span>Cycling benchmark<small>A long ride you can comfortably complete</small></span><span class="input-wrap"><input id="ride-benchmark" data-ride="benchmark" type="number" min="0" max="1000" step="any" inputmode="decimal" placeholder="Not set" value="${levels.rides.benchmark}" aria-describedby="ride-benchmark-help"><span>km</span></span></label><p id="ride-benchmark-help" class="small-print">One distance sets all ride guides: easy 50%, intervals 75%, long ride 100%. For example, 40 km gives 20, 30 and 40 km. Follow each session's time and effort guidance, and adjust the route to suit.</p><h3>In your workout</h3>${[...selectedExercises(levels), ...prehabExercises()].map(exercise => `<div class="settings-exercise"><p>${exercise.name}</p>${weightInput(exercise, 'settings')}</div>`).join('')}<p class="small-print">Other exercises keep their own working weight in the gym library. Use 0 for no added load.</p>`;
}

function openSettings() {
  renderLevels();
  $('#settings-dialog').showModal();
}

function refreshDerived() {
  $$('[data-weight-label]').forEach(element => {
    const exercise = EXERCISES.find(item => item.id === element.dataset.weightLabel);
    element.textContent = weightLabel(levels, exercise);
  });
  $$('[data-duration]').forEach(element => { element.textContent = duration(SESSIONS[element.dataset.duration]); });
}

function showPanel(name) {
  $$('video').forEach(video => video.pause());
  ['calendar', 'library'].forEach(key => {
    const active = key === name;
    $(`#${key}-panel`).hidden = !active;
    $(`#${key}-tab`).setAttribute('aria-selected', String(active));
    $(`#${key}-tab`).tabIndex = active ? 0 : -1;
  });
  if (name === 'library') { renderWorkoutSelection(); renderLibrary(); }
}

function selectExercise(id) {
  const exercise = EXERCISES.find(item => item.id === id);
  levels.workout[exercise.slot] = id;
  save();
  renderWorkoutSelection(); renderWorkoutStrip(); renderCalendar(); renderLibrary();
  const detail = $(`#exercise-${id}`);
  if (detail) { detail.open = true; detail.querySelector('summary').focus({ preventScroll: true }); }
  notify(`${exercise.name} added to your Tuesday workout.`);
}

function showExercise(id) {
  if (id === 'floor-press') id = 'bench-press';
  if (!EXERCISES.some(exercise => exercise.id === id)) return;
  filter = 'all'; query = ''; $('#exercise-search').value = '';
  $$('.filter').forEach(item => { item.classList.toggle('active', item.dataset.filter === 'all'); item.setAttribute('aria-pressed', String(item.dataset.filter === 'all')); });
  showPanel('library');
  const card = $(`#exercise-${id}`);
  card.open = true;
  card.querySelector('summary').focus({ preventScroll: true });
  card.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
}

function showLinkedExercise() {
  if (location.hash.startsWith('#exercise-')) showExercise(location.hash.slice('#exercise-'.length));
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.matches('[data-settings]')) openSettings();
  if (button.id === 'calendar-tab') showPanel('calendar');
  if (button.id === 'library-tab' || button.matches('[data-open-library]')) {
    showPanel('library');
    $('#library-tab').focus({ preventScroll: true });
    if (button.id !== 'library-tab') $('#library-panel').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }
  if (button.matches('[data-workload]')) {
    levels.workload = button.dataset.workload;
    save(); renderWorkloads(); renderCalendar(); renderLibrary();
    $(`#workload-${levels.workload}`).focus({ preventScroll: true });
  }
  if (button.matches('[data-session]')) {
    const id = button.dataset.session;
    openSession = openSession === id ? null : id;
    renderCalendar();
    $(`#session-${id}`).focus({ preventScroll: true });
    if (openSession) $('#session-detail').scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
  }
  if (button.matches('[data-close-session]')) {
    const old = openSession; openSession = null;
    renderCalendar(); $(`#session-${old}`).focus();
  }
  if (button.matches('[data-mode]')) {
    levels.endurance = button.dataset.mode;
    save(); renderCalendar();
    $(`[data-mode="${levels.endurance}"]`).focus({ preventScroll: true });
  }
  if (button.matches('[data-filter]')) {
    filter = button.dataset.filter;
    $$('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    renderLibrary();
  }
  if (button.matches('[data-select-exercise]')) selectExercise(button.dataset.selectExercise);
  if (button.matches('[data-show-exercise]')) {
    showExercise(button.dataset.showExercise);
  }
});

document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'exercise-search') { query = input.value.toLowerCase().trim(); renderLibrary(); return; }
  if (!input.matches('[data-weight], [data-ride]')) return;
  if (!input.validity.valid) return;
  const value = input.value === '' ? '' : Number(input.value);
  if (input.dataset.weight) {
    levels.weights[input.dataset.weight] = value;
    $$(`[data-weight="${input.dataset.weight}"]`).filter(item => item !== input).forEach(item => { item.value = input.value; });
  } else levels.rides[input.dataset.ride] = value;
  save(); refreshDerived();
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-slot]')) selectExercise(event.target.value);
});

document.addEventListener('toggle', event => {
  if (event.target instanceof HTMLDetailsElement && !event.target.open) {
    event.target.querySelectorAll('video').forEach(video => video.pause());
  }
}, true);

function scrollBehavior() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'; }

// Arrow-key, Home and End navigation for the main tab list.
$$('[role="tablist"]').forEach(list => list.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.target);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click(); tabs[next].focus({ preventScroll: true });
}));

$('#settings-dialog').addEventListener('click', event => { if (event.target === $('#settings-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });

$('#export-data').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(levels, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'training-levels.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Levels exported. Keep the file as a backup or import it on another device.');
});

$('label[for="import-data"]').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#import-data').click(); } });

$('#import-data').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('This file is too large for a Training levels backup.');
    const imported = validateLevels(JSON.parse(await file.text()));
    levels = imported; save();
    renderWorkloads(); renderCalendar(); renderWorkoutStrip(); renderWorkoutSelection(); renderLibrary();
    notify(storageAvailable ? 'Your levels and workout choices have been imported and saved.' : 'Levels imported for this visit. Browser saving is unavailable.');
  } catch (error) { notify(error instanceof SyntaxError ? 'This file is not valid JSON. Your current levels are unchanged.' : `${error.message} Your current levels are unchanged.`); }
  finally { event.target.value = ''; }
});

renderWorkloads(); renderCalendar(); renderWorkoutStrip(); renderWorkoutSelection(); renderLibrary();
window.addEventListener('hashchange', showLinkedExercise);
showLinkedExercise();
if (loadWarning) notify(loadWarning);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/service-worker.js').catch(() => { /* Standalone preview may not have the parent site's worker. */ });
