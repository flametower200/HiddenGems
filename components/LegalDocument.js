const DOCUMENTS = {
  privacy: {
    title: 'Informativa privacy',
    intro: 'La documentazione privacy non è ancora stata completata e approvata.',
    pending: [
      'Identità e recapiti del titolare del trattamento.',
      'Finalità, basi giuridiche e tempi di conservazione per ciascun dato.',
      'Destinatari, fornitori, trasferimenti e procedure per esercitare i diritti.',
      'Regole per utenti minorenni, consenso del genitore e visibilità dei dati nei profili.',
    ],
  },
  terms: {
    title: 'Termini di servizio',
    intro: 'I termini di servizio non sono ancora stati completati e approvati.',
    pending: [
      'Regole di accesso, requisiti e responsabilità degli utenti.',
      'Diritti sui contenuti, moderazione, segnalazioni e sospensioni.',
      'Regole per i rapporti tra giocatori, scout, allenatori e società.',
      'Criteri e procedura amministrativa per l’eventuale verifica delle credenziali.',
    ],
  },
  cookies: {
    title: 'Informativa cookie',
    intro: 'L’informativa cookie non è ancora stata completata e approvata.',
    pending: [
      'Inventario verificato di cookie, archiviazione locale e strumenti di terze parti.',
      'Durata, finalità, fornitori e modalità di revoca del consenso.',
      'Al momento non risultano strumenti di analytics o pubblicità nel codice applicativo.',
    ],
  },
  refunds: {
    title: 'Rimborsi e cancellazioni',
    intro: 'La policy su rimborsi e cancellazioni non è ancora stata completata e approvata.',
    pending: [
      'Confermare se esistono acquisti, abbonamenti o servizi a pagamento.',
      'Definire le modalità di cancellazione e gli eventuali diritti di rimborso.',
    ],
  },
};

export default function LegalDocument({ documentKey }) {
  if (documentKey === 'notice') {
    return (
      <main className="legal-document">
        <p className="page-eyebrow">HIDDENGEMS / INFORMAZIONI</p>
        <h1>Note legali / Chi siamo</h1>
        <p className="legal-document__intro">
          HiddenGems mette in contatto giocatori, allenatori, scout e società calcistiche.
          I dati societari qui sotto devono essere forniti e verificati dal titolare prima della pubblicazione.
        </p>
        <dl className="legal-document__details">
          <div><dt>Ragione sociale</dt><dd>Da fornire</dd></div>
          <div><dt>Sede legale</dt><dd>Da fornire</dd></div>
          <div><dt>Partita IVA / codice fiscale</dt><dd>Da fornire</dd></div>
          <div><dt>Contatto legale e privacy</dt><dd>Da configurare</dd></div>
        </dl>
        <p className="legal-document__notice" role="status">
          Questa pagina è incompleta: non rappresenta un’imprint legale definitivo.
        </p>
      </main>
    );
  }

  const document = DOCUMENTS[documentKey];
  if (!document) return null;

  return (
    <main className="legal-document">
      <p className="page-eyebrow">HIDDENGEMS / INFORMAZIONI</p>
      <h1>{document.title}</h1>
      <p className="legal-document__intro">{document.intro}</p>
      <p className="legal-document__notice" role="status">
        Documento in preparazione. Questa pagina non costituisce una policy completa né consulenza legale.
      </p>
      <section aria-labelledby="legal-pending-title">
        <h2 id="legal-pending-title">Informazioni necessarie per completarla</h2>
        <ul>
          {document.pending.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </main>
  );
}
