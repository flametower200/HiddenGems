export default function CareerEditor({ experiences, onChange, error }) {
  const aggiornaEsperienza = (index, campo, valore) => {
    onChange(experiences.map((experience, currentIndex) => (
      currentIndex === index ? { ...experience, [campo]: valore } : experience
    )));
  };

  const aggiungiEsperienza = () => {
    onChange([...experiences, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: '',
      startDate: '',
      endDate: '',
    }]);
  };

  const rimuoviEsperienza = (index) => {
    onChange(experiences.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <section className="career-editor" aria-labelledby="career-editor-title">
      <div className="career-editor__heading">
        <div>
          <h4 id="career-editor-title">La tua carriera</h4>
          <p>Aggiungi esperienze, squadre o incarichi. Puoi inserirne quante vuoi.</p>
        </div>
        <button type="button" className="career-editor__add" onClick={aggiungiEsperienza} aria-label="Aggiungi un'esperienza">
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {experiences.map((experience, index) => (
        <fieldset className="career-editor__experience" key={experience.id}>
          <legend>Esperienza {index + 1}</legend>
          <label>
            <span>Esperienza (max 30 caratteri)</span>
            <input
              type="text"
              maxLength={30}
              value={experience.title}
              onChange={(event) => aggiornaEsperienza(index, 'title', event.target.value)}
              placeholder="Es. AC Milano"
              required
            />
          </label>
          <div className="career-editor__dates">
            <label>
              <span>Data di inizio</span>
              <input
                type="date"
                value={experience.startDate}
                onChange={(event) => aggiornaEsperienza(index, 'startDate', event.target.value)}
                required
              />
            </label>
            <label>
              <span>Data di fine <small>(facoltativa se attuale)</small></span>
              <input
                type="date"
                value={experience.endDate}
                min={experience.startDate || undefined}
                onChange={(event) => aggiornaEsperienza(index, 'endDate', event.target.value)}
              />
            </label>
          </div>
          <button type="button" className="career-editor__remove" onClick={() => rimuoviEsperienza(index)}>
            Rimuovi esperienza
          </button>
        </fieldset>
      ))}

      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
