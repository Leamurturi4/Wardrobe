export function DataStatus({ pending, error }: { pending?: boolean; error?: Error | null }) {
  if (error) return <p role="alert">Could not load your closet. {error.message} <button onClick={() => window.location.reload()}>Retry</button></p>;
  return pending ? <p role="status">Loading your closet…</p> : null;
}
