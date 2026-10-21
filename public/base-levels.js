// Starting values for a new browser, or if its saved setup cannot be loaded.
// Saved browser levels take precedence. Site edits do not rewrite this file.
// Distances are km. Weights are kg, with units noted beside each exercise.
// Use '' for an unset value, or 0 for no added load.
export const BASE_LEVELS = {
  rides: { benchmark: 60 }, // A comfortable long ride; easy = 30 km, intervals = 45 km.
  weights: {
    'split-squat': 0, // Per dumbbell.
    rdl: 0, // Per dumbbell.
    'calf-raise': 0, // Total held.
    'bench-press': 0, // Per dumbbell.
    row: 0, // In the working hand.
    'goblet-squat': 0, // Total held.
    'reverse-lunge': 0, // Per dumbbell.
    'glute-bridge': 0, // Total on hips.
    'overhead-press': 0, // Per dumbbell.
    'pull-up': 0, // Added to bodyweight.
    'suitcase-carry': 0, // In the working hand.
    'external-rotation': 0, // In the working hand.
    'wrist-extension': 0, // In the working hand.
  },
};
