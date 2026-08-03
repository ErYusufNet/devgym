export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center">
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-navy mb-6">Build real experience on real teams</h1>
        <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">ErNord helps unemployed and early-career developers gain real team experience through non-commercial projects. Publish a project, build a team, ship it together on GitHub.</p>
        <div className="flex justify-center gap-4">
          <a href="/register" className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover">Get started for free</a>
          <a href="/discover" className="px-6 py-3 border border-slate-300 rounded-lg font-medium text-navy hover:bg-surface">Explore projects</a>
        </div>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-32 grid sm:grid-cols-3 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-navy mb-2">Start or join a project</h3>
          <p className="text-sm text-secondary">Publish your own project and open positions. Or join someone else's and work on a real team.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-navy mb-2">Ship on GitHub</h3>
          <p className="text-sm text-secondary">Every project is backed by a real GitHub repo. Your contributions go straight into your portfolio.</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-navy mb-2">Stay sharp</h3>
          <p className="text-sm text-secondary">Keep practicing with current technologies, even while you're between jobs.</p>
        </div>
      </section>
    </div>
  );
}
