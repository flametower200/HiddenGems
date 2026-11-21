'use client';

import {
  PLAYER_POSITION_CATEGORIES,
  PLAYER_POSITION_OPTIONS,
  categoryForPlayerPosition,
  positionsForCategory,
} from '../lib/playerPositions';

export default function PlayerPositionFields({
  position,
  onPositionChange,
  secondaryPosition,
  onSecondaryPositionChange,
  idPrefix,
  secondary = true,
  required = true,
}) {
  const category = categoryForPlayerPosition(position);
  const categoryPositions = positionsForCategory(category);
  const currentPositionIsLegacy = position && !categoryPositions.includes(position);

  return (
    <div className="player-position-fields">
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-category`}>Reparto</label>
        <select
          id={`${idPrefix}-category`}
          value={category}
          onChange={(event) => onPositionChange(positionsForCategory(event.target.value)[0] || '')}
        >
          <option value="">Seleziona il reparto…</option>
          {PLAYER_POSITION_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-position`}>Ruolo specifico</label>
        <select
          id={`${idPrefix}-position`}
          value={position}
          required={required}
          disabled={!category}
          onChange={(event) => onPositionChange(event.target.value)}
        >
          <option value="">Seleziona il ruolo…</option>
          {currentPositionIsLegacy && <option value={position}>{position} (valore attuale)</option>}
          {categoryPositions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {secondary && (
        <div className="field">
          <label className="field__label" htmlFor={`${idPrefix}-secondary-position`}>Ruolo secondario (opzionale)</label>
          <select
            id={`${idPrefix}-secondary-position`}
            value={secondaryPosition}
            onChange={(event) => onSecondaryPositionChange(event.target.value)}
          >
            <option value="">Nessuno</option>
            {secondaryPosition && !PLAYER_POSITION_OPTIONS.some((item) => item.value === secondaryPosition) && (
              <option value={secondaryPosition}>{secondaryPosition} (valore attuale)</option>
            )}
            {PLAYER_POSITION_CATEGORIES.map((item) => (
              <optgroup key={item} label={item}>
                {positionsForCategory(item).map((role) => <option key={role} value={role}>{role}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
