type PublicCollectionEmptyStateProps = {
  title: string;
  body: string;
};

export function PublicCollectionEmptyState({ title, body }: PublicCollectionEmptyStateProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto max-w-xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="text-sm leading-7 text-slate-600">{body}</p>
      </div>
    </section>
  );
}
