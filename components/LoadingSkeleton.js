function SkeletonLines({ count = 3 }) {
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  );
}

function SkeletonCard({ variant = 'profile' }) {
  return (
    <div className={`skeleton-card skeleton-card--${variant}`} aria-hidden="true">
      <span className="skeleton-block skeleton-card__avatar" />
      <div className="skeleton-card__content">
        <span className="skeleton-block skeleton-card__title" />
        <SkeletonLines count={2} />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'page' }) {
  if (variant === 'feed') {
    return (
      <main className="page skeleton-page" aria-label="Caricamento feed" aria-busy="true">
        <div className="skeleton-header" aria-hidden="true"><span /><div><i /><i /><i /><i /><i /></div></div>
        <div className="container container--wide feed-container">
          <div className="feed-heading">
            <SkeletonLines count={2} />
          </div>
          <div className="feed-list">
            {[0, 1, 2].map((item) => (
              <div className="skeleton-post" key={item} aria-hidden="true">
                <div className="skeleton-post__header">
                  <span className="skeleton-block skeleton-card__avatar" />
                  <SkeletonLines count={2} />
                </div>
                <span className="skeleton-block skeleton-post__video" />
                <SkeletonLines count={2} />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (variant === 'messages') {
    return (
      <main className="page skeleton-page" aria-label="Caricamento messaggi" aria-busy="true">
        <div className="container messages-screen__container">
          <SkeletonLines count={2} />
          <div className="skeleton-list">
            {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} />)}
          </div>
        </div>
      </main>
    );
  }

  if (variant === 'thread') {
    return (
      <div className="skeleton-thread" aria-label="Caricamento messaggi" aria-busy="true">
        {[0, 1, 2, 3].map((item) => <span key={item} className={item % 2 ? 'skeleton-thread__bubble is-mine' : 'skeleton-thread__bubble'} />)}
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <main className="page skeleton-page" aria-label="Caricamento profilo" aria-busy="true">
        <div className="container profile-screen__container">
          <div className="skeleton-profile">
            <span className="skeleton-block skeleton-profile__avatar" />
            <SkeletonLines count={2} />
          </div>
          <div className="skeleton-profile__details"><SkeletonLines count={6} /></div>
        </div>
      </main>
    );
  }

  if (variant === 'results') {
    return (
      <div className="skeleton-grid" aria-label="Caricamento risultati" aria-busy="true">
        {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} />)}
      </div>
    );
  }

  if (variant === 'search') {
    return (
      <main className="page skeleton-page" aria-label="Caricamento ricerca" aria-busy="true">
        <div className="skeleton-header" aria-hidden="true"><span /><div><i /><i /><i /><i /><i /></div></div>
        <div className="container container--wide search-screen">
          <SkeletonLines count={3} />
          <div className="skeleton-search">
            {[0, 1, 2, 3].map((item) => <span className="skeleton-block" key={item} />)}
          </div>
          <div className="skeleton-grid">
            {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} />)}
          </div>
        </div>
      </main>
    );
  }

  if (variant === 'auth') {
    return (
      <main className="page auth-shell skeleton-page" aria-label="Caricamento" aria-busy="true">
        <div className="auth-card skeleton-auth">
          <SkeletonLines count={4} />
          <span className="skeleton-block skeleton-auth__button" />
        </div>
      </main>
    );
  }

  return (
    <main className="page skeleton-page" aria-label="Caricamento" aria-busy="true">
      <div className="container"><SkeletonLines count={5} /></div>
    </main>
  );
}
