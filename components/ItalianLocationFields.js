'use client';

import { ITALIAN_REGION_OPTIONS, provinceOptionsForRegion } from '../lib/italianLocations';

export default function ItalianLocationFields({
  region,
  province,
  onRegionChange,
  onProvinceChange,
  idPrefix,
  required = false,
}) {
  const provinces = provinceOptionsForRegion(region);

  return (
    <div className="italian-location-fields">
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-region`}>Regione</label>
        <select
          id={`${idPrefix}-region`}
          value={region}
          required={required}
          onChange={(event) => {
            onRegionChange(event.target.value);
            onProvinceChange('');
          }}
        >
          <option value="">Seleziona la regione…</option>
          {!ITALIAN_REGION_OPTIONS.some((option) => option.value === region) && region && (
            <option value={region}>{region} (valore attuale)</option>
          )}
          {ITALIAN_REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-province`}>Provincia</label>
        <select
          id={`${idPrefix}-province`}
          value={province}
          required={required}
          disabled={!region}
          onChange={(event) => onProvinceChange(event.target.value)}
        >
          <option value="">Seleziona la provincia…</option>
          {!provinces.includes(province) && province && (
            <option value={province}>{province} (valore attuale)</option>
          )}
          {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
    </div>
  );
}
