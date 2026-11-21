export const PLAYER_POSITIONS_BY_CATEGORY = {
  Portiere: ['Portiere'],
  Difensore: [
    'Difensore centrale',
    'Terzino destro',
    'Terzino sinistro',
    'Braccetto destro',
    'Braccetto sinistro',
    'Quinto destro',
    'Quinto sinistro',
  ],
  Centrocampista: [
    'Mediano',
    'Centrocampista centrale',
    'Mezzala destra',
    'Mezzala sinistra',
    'Trequartista',
  ],
  Attaccante: [
    'Ala destra',
    'Ala sinistra',
    'Seconda punta',
    'Punta centrale',
  ],
};

export const PLAYER_POSITION_CATEGORIES = Object.keys(PLAYER_POSITIONS_BY_CATEGORY);
export const PLAYER_POSITION_OPTIONS = PLAYER_POSITION_CATEGORIES.flatMap((category) => (
  PLAYER_POSITIONS_BY_CATEGORY[category].map((position) => ({ value: position, label: position, category }))
));

export function categoryForPlayerPosition(position) {
  return PLAYER_POSITION_OPTIONS.find((option) => option.value === position)?.category
    || PLAYER_POSITION_CATEGORIES.find((category) => category === position)
    || '';
}

export function positionsForCategory(category) {
  return PLAYER_POSITIONS_BY_CATEGORY[category] || [];
}
