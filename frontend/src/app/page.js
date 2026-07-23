export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 py-6">
        <span className="text-xl font-semibold text-zinc-900 dark:text-white">&lt;/&gt; DevGym</span>
        <div className="flex gap-3">
          <a href="/login" className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">Giriş yap</a>
          <a href="/register" className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">Kayıt ol</a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-6">Gerçek takımlarda, gerçek deneyim kazan</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-xl mx-auto">DevGym, işsiz veya deneyimsiz yazılımcıların gönüllü projelerde gerçek takım deneyimi kazanmasını sağlayan bir platform. Proje aç, ekip kur, GitHub üzerinden birlikte üret.</p>
        <div className="flex justify-center gap-4">
          <a href="/register" className="px-6 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">Ücretsiz başla</a>
          <a href="/discover" className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900">Projeleri keşfet</a>
        </div>
      </main>

      <section className="max-w-5xl mx-auto px-6 pb-32 grid sm:grid-cols-3 gap-8">
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Proje kur veya katıl</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Kendi projeni yayınla, pozisyon aç. Ya da başkasının projesine katılıp gerçek bir takımda çalış.</p>
        </div>
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-white mb-2">GitHub üzerinden üret</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Her proje gerçek bir GitHub reposuna bağlı. Katkıların portfolyona doğrudan yansır.</p>
        </div>
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Beceri kaybetme</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">İş ararken bile aktif kal, güncel teknolojilerle pratik yapmaya devam et.</p>
        </div>
      </section>
    </div>
  );
}