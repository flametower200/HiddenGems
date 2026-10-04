'use client';

import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { countryLabel } from '../lib/profileOptions';

const ACCOUNT_LABELS = {
  giocatore: 'Giocatore',
  allenatore: 'Allenatore',
  scout: 'Scout',
  societa: 'Società',
};

function detailsFor(profile) {
  const details = profile.dettaglio;
  if (!details) return '';

  if (profile.tipo_account === 'giocatore') {
    return [details.ruolo_principale, details.piede, countryLabel(details.nazione)].filter(Boolean).join(' · ');
  }
  if (profile.tipo_account === 'allenatore') {
    return [details.patentino, countryLabel(details.nazione)].filter(Boolean).join(' · ');
  }
  if (profile.tipo_account === 'scout') {
    return [details.societa_attuale, countryLabel(details.nazione)].filter(Boolean).join(' · ');
  }
  if (profile.tipo_account === 'societa') {
    return [details.categoria, details.annata_squadra, countryLabel(details.nazione)].filter(Boolean).join(' · ');
  }
  return '';
}

export default function ProfileCard({ profile, currentUserId }) {
  const isCurrentUser = profile.id === currentUserId;
  const fullName = [profile.nome, profile.cognome].filter(Boolean).join(' ');
  const detail = detailsFor(profile);

  return (
    <Link
      href={isCurrentUser ? '/profilo' : `/profilo/${profile.id}`}
      className={`talent-card talent-card--${profile.tipo_account}`}
      aria-label={`Apri il profilo di ${fullName}`}
    >
      <UserAvatar src={profile.foto_url} name={fullName || 'HiddenGems'} size={54} className="talent-card__avatar" />
      <span className="talent-card__main">
        <span className="talent-card__name">{fullName || 'Profilo'}</span>
        {detail && <span className="talent-card__detail">{detail}</span>}
        <span className={`talent-card__badge badge--${profile.tipo_account}`}>
          {ACCOUNT_LABELS[profile.tipo_account] || profile.tipo_account}
        </span>
      </span>
      <span className="talent-card__arrow" aria-hidden="true">→</span>
    </Link>
  );
}
