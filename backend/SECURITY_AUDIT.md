# DevGym / ErNord — Güvenlik ve Dayanıklılık Denetim Raporu

**Tarih:** 2026-08-04
**Kapsam:** `backend/` (FastAPI + SQLAlchemy + SQLite), OAuth entegrasyonları (Discord, GitHub)
**Yöntem:** Statik kod incelemesi + çalışan yerel backend'e karşı gerçek canlı testler (curl / Python `requests` ile). Test sırasında oluşturulan tüm veriler (32 test kullanıcısı, 4 test projesi, 1 gerçek Discord kanalı) denetim sonunda temizlendi.
**Not:** Bu rapor salt tespit amaçlıdır — hiçbir kod değişikliği yapılmamıştır.

---

## Bulgu Özeti

| # | Başlık | Kritiklik |
|---|--------|-----------|
| 1 | Hardcoded JWT secret'ları, public GitHub reposunda | 🔴 Kritik |
| 2 | Bazı endpoint'lerde hiç kimlik doğrulama yok | 🟠 Yüksek |
| 3 | Başvuru e-postaları herkese açık | 🟠 Yüksek |
| 4 | OAuth "state" parametresi yok (hesap bağlama CSRF'i) | 🟠 Yüksek |
| 5 | Rate limiting / brute-force koruması yok | 🟡 Orta |
| 6 | `GET /applications` platform genelinde herkese açık | 🟡 Orta |
| 7 | `GET /users` tüm e-postaları auth'suz döndürüyor | 🟡 Orta |
| 8 | Dış API hataları ham haliyle client'a yansıyor | 🟡 Orta |
| 9 | Metin alanlarında uzunluk sınırı yok | 🟢 Düşük |
| 10 | Takım arkadaşı e-postaları takım içi endpoint'lerde görünüyor | 🟢 Düşük |

Raporun sonunda ayrıca **incelenip sorun bulunmayan** maddelerin listesi de var (SQL injection, sahiplik kontrolleri, hassas veri sızıntısı, 404 davranışı, debug/stack-trace sızıntısı).

---

## 🔴 #1 — Hardcoded JWT secret'ları, artık PUBLIC GitHub reposunda

**Kritiklik: KRİTİK**

### Sorun tam olarak nerede

`backend/auth.py` dosyasında, üstte satır 7-8'de Türkçe bir yorum var: *"Bu gizli anahtar sadece geliştirme (development) içindir. İleride .env dosyasına taşıyacağız, asla GitHub'a gerçek anahtarla push etmeyeceğiz."* Bu taşıma hiç gerçekleşmedi. İki sabit değer hâlâ doğrudan kaynak kodunda, düz metin (plaintext) bir Python string literal'ı olarak tanımlı:

- **`backend/auth.py`, satır 9** — `SECRET_KEY` adlı bir değişken, sabit bir string'e eşitleniyor. Bu değer, `create_access_token()` (satır 24-28) ve `decode_access_token()` (satır 31-35) fonksiyonlarında JWT'leri imzalamak/doğrulamak için kullanılıyor — yani `/login` endpoint'inin ürettiği ve `Authorization: Bearer ...` header'ıyla her istekte gönderilen oturum token'ının tamamı bu tek değere dayanıyor.
- **`backend/auth.py`, satır 40** — `PASSWORD_RESET_SECRET_KEY` adlı ayrı bir sabit, yine düz metin string. `create_password_reset_token()` (satır 45-48) ve `verify_password_reset_token()` (satır 51-59) fonksiyonlarında, `/forgot-password` → `/reset-password` şifre sıfırlama akışının token'larını imzalamak için kullanılıyor.

*(Gerçek değerler burada bilerek yazılmıyor — dosyanın kendisinde okunabilir durumdalar. Her ikisi de insan tarafından okunabilir, "değiştir bunu production'da" ifadesi içeren, tahmin edilebilir/placeholder karakterli sabit string'ler.)*

`backend/auth.py`, `.gitignore`'da yok (yalnızca `backend/.env` ignore edilmiş durumda — `.env` içindeki `SMTP_PASSWORD`, `DISCORD_BOT_TOKEN`, `GITHUB_CLIENT_SECRET` gibi diğer secret'lar doğru şekilde bu dosyada tutuluyor ve git'e hiç girmiyor). Ama `auth.py` sıradan, takip edilen bir kaynak dosyası — her `git push`'ta bu iki secret de commit geçmişine işleniyor.

### Neden kritik

Bu depoyu ziyaret ettim: `curl -o /dev/null -w "%{http_code}" https://github.com/ErYusufNet/devgym` → **200** döndü. Yani **repo şu an public** — GitHub hesabı olan/olmayan herkes bu iki satırı doğrudan okuyabilir.

`python-jose` kütüphanesinin kullandığı HS256, **simetrik** bir imzalama algoritmasıdır: token'ı imzalamak için kullanılan anahtarla, token'ı doğrulamak için kullanılan anahtar birebir aynıdır. Yani bu string'i bilen HERKES (repo public olduğu için artık dünyadaki herkes), backend'in geçerli kabul edeceği bir JWT'yi, hiçbir şifreye ihtiyaç duymadan, hiçbir API isteği atmadan, tamamen kendi bilgisayarında üretebilir.

### Canlı testle kanıtlandı (iki ayrı senaryo)

**Senaryo A — Oturum token'ı sahteciliği:**
1. `audit.victim@example.com` adlı bir test hesabı oluşturuldu, gerçek şifresiyle giriş yapıldı, bir proje oluşturuldu.
2. Hiçbir API çağrısı yapılmadan, sadece `auth.py:9`'daki değerle (`python-jose` kullanılarak, backend'in kendi yöntemiyle birebir aynı şekilde) `{"sub": "<kurbanın gerçek user_id'si>"}` içerikli sahte bir JWT üretildi.
3. Bu sahte token `Authorization: Bearer ...` header'ına konup `DELETE /projects/{id}` çağrıldı → **200 OK, proje gerçekten silindi.**

**Senaryo B — Şifre sıfırlama token'ı sahteciliği (daha ciddi):**
1. Ayrı bir test hesabı oluşturuldu (bilinen orijinal şifresiyle).
2. `auth.py:40`'daki değerle, kurbanın e-postasına hiç erişmeden, gerçek `/forgot-password` akışına hiç girmeden, sahte bir reset token'ı üretildi.
3. `POST /reset-password`'e gönderildi → **200 OK, "Password has been reset successfully."**
4. Doğrulama: kurbanın orijinal şifresiyle giriş artık **401**, saldırganın belirlediği yeni şifreyle giriş **200**.

Bu ikinci senaryo, **e-posta erişimine bile ihtiyaç duymadan** bir hesabın kalıcı olarak tamamen ele geçirilmesi anlamına geliyor.

### Etki alanı

Bu, sadece yerel geliştirme ortamını değil — aynı `auth.py` dosyası (aksi belirtilmediyse aynı hardcoded değerlerle) Railway'deki canlı backend'de de çalışıyor. Yani üretimdeki (production) her gerçek hesap da bu açığa maruz. Saldırganın hangi `user_id`'yi hedefleyeceğini bulması da zor değil — bkz. Bulgu #7 (`GET /users` kimlik doğrulamasız tüm kullanıcı ID'lerini ve e-postalarını veriyor).

### Önerilen çözüm

1. **İki değeri de `.env`'e taşı**, tıpkı `GITHUB_CLIENT_SECRET`/`DISCORD_BOT_TOKEN` gibi diğer secret'ların zaten yapıldığı gibi — `auth.py`'nin başına `from dotenv import load_dotenv; load_dotenv()` ekleyip `SECRET_KEY = os.getenv("JWT_SECRET_KEY")` / `PASSWORD_RESET_SECRET_KEY = os.getenv("JWT_PASSWORD_RESET_SECRET_KEY")` şeklinde oku (diğer `*_utils.py` dosyalarındaki mevcut desenle birebir aynı).
2. **Kritik nüans:** Sadece aynı string'i `.env`'e taşımak yeterli DEĞİL — bu değer zaten git geçmişinde public olarak duruyor, artık "sızmış" sayılmalı. `.env`'e konacak değer **yeni, kriptografik olarak rastgele üretilmiş** bir string olmalı (örn. Python'da `python -c "import secrets; print(secrets.token_hex(32))"`).
3. Secret'ı değiştirmenin (rotate etmenin) yan etkisi: mevcut tüm oturum token'ları (ve varsa bekleyen şifre sıfırlama linkleri) geçersiz olur, kullanıcıların yeniden giriş yapması gerekir — bu platformun şu anki erken/test aşamasında kabul edilebilir bir maliyet.
4. Railway'deki production ortamına da bu yeni secret'ları ortam değişkeni olarak eklemeyi unutma (yerel `.env` production'a otomatik yansımaz).
5. Uzun vadede: repo public kaldığı sürece, bu tür secret'ların git geçmişinde hiç var olmaması gerekiyor. Geçmiş commit'lerdeki eski değerler zaten değersizleşecek (rotate edildiği için), ama istenirse `git filter-repo` gibi bir araçla geçmişten de temizlenebilir (opsiyonel, aciliyeti düşük çünkü rotate etmek tek başına saldırıyı durdurur).

---

## 🟠 #2 — Bazı endpoint'lerde hiç kimlik doğrulama yok

**Kritiklik: YÜKSEK**

### Sorun tam olarak nerede

`backend/main.py` içinde aşağıdaki fonksiyonlar, diğer yazma (write) endpoint'lerinin aksine `current_user: models.User = Depends(get_current_user)` parametresini hiç almıyor:

- `create_position` — `POST /projects/{project_id}/positions`
- `create_work_experience` — `POST /users/{user_id}/work-experience`
- `create_education` — `POST /users/{user_id}/education`
- `delete_work_experience` — `DELETE /work-experience/{experience_id}`
- `delete_education` — `DELETE /education/{education_id}`

### Neden sorun

Bu endpoint'ler `Authorization` header'ı hiç olmadan (yani hiçbir hesaba giriş yapmadan) çağrılabiliyor. `create_position`, proje `owner_id`'sini hiç kontrol etmeden herhangi bir `project_id`'ye pozisyon ekliyor. `create_work_experience`/`create_education`, hedef `user_id`'nin istek atan kişiyle aynı olup olmadığını hiç kontrol etmiyor. `delete_work_experience`/`delete_education` ise en ciddisi: kaydın sahibiyle ilgili **hiçbir** doğrulama yapmadan, sadece ID verilirse siliyor — ve bu ID'ler ilgili kullanıcının public profilinden (`GET /users/{id}/work-experience` vb.) zaten görülebilir durumda.

### Canlı testle kanıtlandı

Hiçbir `Authorization` header'ı gönderilmeden:
- `POST /projects/{id}/positions` → **200**, kurbanın projesine sahte bir pozisyon eklendi
- `POST /users/{kurban_id}/work-experience` → **200**, kurbanın profiline sahte bir iş deneyimi eklendi
- `DELETE /work-experience/{az önce eklenen kaydın id'si}` → **200**, kayıt sahiplik kontrolü olmadan silindi

### Önerilen çözüm

Her birine `current_user: models.User = Depends(get_current_user)` parametresi ekle, ardından:
- `create_position`: mevcut `create_position`'ın kardeşleri (`delete_position` gibi) zaten yaptığı gibi, projeyi çekip `project.owner_id != current_user.id` ise 403 dön.
- `create_work_experience` / `create_education`: `if user_id != current_user.id: raise HTTPException(403, ...)` (tıpkı `update_user`'ın zaten yaptığı gibi).
- `delete_work_experience` / `delete_education`: kaydı çektikten sonra `if experience.user_id != current_user.id: raise HTTPException(403, ...)` şeklinde bir sahiplik kontrolü ekle.

---

## 🟠 #3 — `GET /projects/{project_id}/applications` → başvuru e-postaları herkese açık

**Kritiklik: YÜKSEK**

### Sorun tam olarak nerede

`backend/main.py`, `get_project_applications` fonksiyonu (`GET /projects/{project_id}/applications`). Fonksiyon imzasında `current_user` parametresi yok — sadece `project_id` ve `db` alıyor.

### Neden sorun

Bu endpoint, her başvuru için `applicant_name` **ve `applicant_email`** döndürüyor. Amacı proje sahibinin "My projects" sayfasında kendi projesine başvuranları görmesi, ama hiçbir sahiplik kontrolü yapılmadığı için, herhangi bir `project_id` biliniyorsa (bu ID'ler zaten public discover sayfasından görülebiliyor), o projeyle hiçbir ilgisi olmayan **herkes**, giriş yapmadan, başvuranların gerçek e-posta adreslerini görebiliyor.

### Canlı testle kanıtlandı

Kimlik doğrulaması olmadan `GET /projects/{proje_id}/applications` çağrıldı → **200**. Test edilen projede başvuru olmadığı için liste boş döndü, ama endpoint'in kendisi hiçbir yetki kontrolü yapmadan çalışıyor — gerçek başvurusu olan bir projede e-postalar doğrudan dönecektir.

### Önerilen çözüm

`current_user: models.User = Depends(get_current_user)` ekle, projeyi çekip `project.owner_id != current_user.id` ise 403 dön (diğer proje-sahibi-özel endpoint'lerle aynı desen).

---

## 🟠 #4 — OAuth "state" parametresi yok (hesap bağlama CSRF'i)

**Kritiklik: YÜKSEK**

### Sorun tam olarak nerede

- `backend/discord_utils.py`, `get_oauth_url()` fonksiyonu
- `backend/github_utils.py`, `get_oauth_url()` fonksiyonu

İkisi de yetkilendirme URL'ini oluştururken standart OAuth2 `state` parametresini hiç eklemiyor. Karşılık gelen `backend/main.py` içindeki `discord_callback` ve `github_callback` fonksiyonları da (her ikisi de sadece `payload.code` alıyor) böyle bir değeri hiç doğrulamıyor.

### Neden sorun

`state` parametresinin amacı, callback'e gelen `code`'un gerçekten BİZİM az önce BU kullanıcı için başlattığımız bir akıştan geldiğini doğrulamaktır. Bu olmadan şu saldırı mümkün:

1. Saldırgan kendi Discord/GitHub hesabıyla bizim uygulamamızın OAuth akışını başlatır, **kendi hesabı için** geçerli bir `code` alır (kullanmadan saklar).
2. Saldırgan, sitemize zaten giriş yapmış olan kurbanı `sitemiz.com/github-callback?code=<saldırganın kodu>` linkine tıklamaya kandırır.
3. Kurbanın tarayıcısı sayfayı açar; sayfa kurbanın **kendi** `localStorage`'ındaki Bearer token'ıyla `POST /github/callback`'i çağırır, `code` olarak saldırganın kodunu gönderir.
4. Backend bu kodun GitHub nezdinde geçerli olduğunu doğrular (gerçekten saldırganın hesabına ait olduğu için geçerlidir) ve **saldırganın GitHub kullanıcı adını kurbanın Ernord hesabına bağlar.**

Bu, çerez tabanlı klasik CSRF'ten farklıdır (auth burada Bearer token ile yapılıyor, çerezle değil) ama sonuç aynı derecede zararlı: hesap bağlama işlemi kurbanın rızası/farkındalığı olmadan gerçekleşiyor.

**Platforma özgü zincirleme etki:** `accept_application` fonksiyonu, kabul edilen bir başvuru için collaborator daveti gönderirken `applicant.github_username` alanını kullanıyor. Saldırgan bu CSRF ile kurbanın hesabına kendi GitHub kullanıcı adını bağlamışsa, kurban bir projeye kabul edildiğinde **saldırganın hesabı** o projenin özel repo'suna collaborator olarak eklenir. Discord tarafında da benzer şekilde saldırganın hesabı kurbanın yerine özel takım kanalına eklenebilir.

### Doğrulama şekli

Gerçek harici hesaplar gerektirdiği için canlı olarak simüle edilmedi; her iki `get_oauth_url()` fonksiyonu okunarak `state` üretimi/doğrulamasının hiç olmadığı teyit edildi (statik kod incelemesi).

### Önerilen çözüm

1. `/discord/connect` ve `/github/connect` endpoint'lerinde, rastgele bir `state` değeri üret (örn. `secrets.token_urlsafe(32)`), bunu `current_user.id` ile ilişkilendirerek kısa ömürlü bir şekilde sakla (basit bir in-memory `{state: (user_id, expires_at)}` dict yeterli olur, tıpkı GitHub commit cache'inde kullanılan desen gibi).
2. Bu `state`'i OAuth URL'ine ekle, frontend'in callback sayfasına (`discord-callback`/`github-callback`) `state`'i de `code` ile birlikte geri göndermesini sağla.
3. `discord_callback`/`github_callback` endpoint'lerinde, gelen `state`'in daha önce BU `current_user` için üretilmiş ve süresi dolmamış bir değer olduğunu doğrula; eşleşmiyorsa 400 dön. Doğrulama sonrası `state`'i sakladığın yerden sil (tek kullanımlık olsun).

---

## 🟡 #5 — Rate limiting / brute-force koruması yok

**Kritiklik: ORTA**

### Sorun tam olarak nerede

`backend/requirements.txt` kontrol edildi — `slowapi` veya benzeri bir rate-limit kütüphanesi kurulu değil. `backend/main.py` genelinde elle yazılmış herhangi bir istek sayma/kilitleme/gecikme mantığı da yok. Özellikle etkilenen endpoint'ler: `POST /users` (kayıt), `POST /login`, `POST /forgot-password`.

### Neden sorun

Kayıt, giriş ve şifre sıfırlama formları sınırsız sayıda otomatik isteği kabul ediyor.

### Canlı testle kanıtlandı

- `POST /users`: Aynı kaynaktan 30 art arda kayıt isteği, 6.74 saniyede tamamlandı, **hepsi 200** — engelleme yok.
- `POST /login`: Gerçek bir hesaba karşı 30 art arda yanlış şifre denemesi, **hepsi 401** — kilitleme (lockout), CAPTCHA veya artan gecikme (backoff) yok. Dağıtık/paralel brute-force tamamen mümkün.
- `POST /forgot-password`: Aynı e-postaya 10 art arda istek, **hepsi 200** — tek "sınırlayıcı" gerçek SMTP gönderim gecikmesi (istek başına ~2.7 sn), bu kasıtlı bir koruma değil. Bir kullanıcının gerçek gelen kutusu bu şekilde spam'lenebilir.

*(Olumlu not: `forgot-password`, e-posta sistemde kayıtlı olsun olmasın her zaman aynı mesajı döndürüyor — hesap numaralandırma saldırısına karşı doğru bir pratik, bu ayrıca doğrulandı.)*

### Önerilen çözüm

`slowapi` (FastAPI ile uyumlu, Flask-Limiter'ın FastAPI portu) gibi bir kütüphane ekle:
- `POST /login`: IP başına ve/veya e-posta başına dakikada birkaç deneme ile sınırla; art arda başarısız denemelerde artan gecikme veya geçici hesap kilidi düşünülebilir.
- `POST /users`: IP başına saatte makul bir kayıt sayısıyla sınırla.
- `POST /forgot-password`: aynı e-posta için kısa bir soğuma süresi (örn. 1 dakikada 1 istek) uygula.

---

## 🟡 #6 — `GET /applications` platform genelinde herkese açık

**Kritiklik: ORTA**

### Sorun tam olarak nerede

`backend/main.py`, `list_applications` fonksiyonu (`GET /applications`). `db.query(models.Application).all()` — hiçbir filtre, hiçbir `current_user` parametresi yok.

### Neden sorun

Platformdaki HERKESİN, HER projeye yaptığı HER başvurunun `position_id`, `user_id`, `status`, `applied_at` bilgisi, giriş yapılmadan görülebiliyor. Doğrudan e-posta/isim içermiyor (response şeması sadece ID'ler döndürüyor — bkz. `schemas.ApplicationOut`) ama iş verisi anlamında bir yetkilendirme boşluğu: "kim nereye başvurdu" bilgisi herkese açık, ayrıca frontend kod tabanında bu endpoint'in kullanıldığı bir yer görünmüyor (muhtemelen kullanılmayan/unutulmuş bir endpoint).

### Canlı testle kanıtlandı

Kimlik doğrulaması olmadan `GET /applications` → **200** (test ortamında 0 kayıt olsa da, endpoint hiçbir yetki kontrolü yapmadan tüm tabloyu sorgulamaya hazır).

### Önerilen çözüm

Frontend'de kullanılmıyorsa endpoint'i tamamen kaldır. Kullanılacaksa `current_user` ekle ve sorguyu `models.Application.user_id == current_user.id` ile kendi başvurularıyla sınırla (ya da proje sahibiyse kendi projelerine ait başvurularla).

---

## 🟡 #7 — `GET /users` tüm e-postaları auth'suz döndürüyor

**Kritiklik: ORTA**

### Sorun tam olarak nerede

`backend/main.py`, `list_users` fonksiyonu (`GET /users`). `response_model=list[schemas.UserOut]` ile tüm kullanıcı tablosunu döndürüyor, hiçbir `current_user` parametresi yok. `schemas.UserOut` şeması `email: EmailStr` alanını içeriyor.

### Neden sorun (ve neden özellikle dikkat çekici)

Platformda zaten bilinçli olarak tasarlanmış bir public "yetenek arama" endpoint'i var: `search_users` (`GET /users/search`). O fonksiyonun döndürdüğü dict'te **email alanı bilerek yok** (`id`, `full_name`, `bio`, `skills`, `years_of_experience`, `languages`, `preferred_title`, `experience_level`, `reputation`) — yani birileri "public arama sonuçlarında e-posta gösterme" kararını bilinçli olarak almış. Ama `GET /users` bu kararı tamamen es geçip ham `UserOut`'u (email dahil) hiçbir korumasız şekilde dışarı veriyor. Bu, muhtemelen kasıtsız bırakılmış, unutulmuş bir debug/geliştirme endpoint'i gibi görünüyor.

### Canlı testle kanıtlandı

Bu denetim boyunca defalarca kimlik doğrulamasız çağrıldı (`curl http://127.0.0.1:8000/users`) — her seferinde tüm kullanıcıların e-postası dahil tam listesi döndü.

### Önerilen çözüm

Bu endpoint frontend'de kullanılmıyorsa (bu denetimde frontend kodunda bir kullanım yeri görülmedi) tamamen kaldır. Bir admin paneli için gerekiyorsa, auth + rol kontrolü ekle. Public bir "tüm kullanıcıları gör" özelliği isteniyorsa, `search_users`'ın zaten uyguladığı güvenli alan listesini kullan.

---

## 🟡 #8 — Dış API hataları ham haliyle client'a yansıyor

**Kritiklik: ORTA**

### Sorun tam olarak nerede

`backend/main.py` içinde dört yer, harici bir API çağrısı (Discord/GitHub) başarısız olduğunda Python exception'ının string halini doğrudan HTTP response'a koyuyor:

- `create_discord_room`: `raise HTTPException(status_code=502, detail=f"Could not create Discord channel: {exc}")`
- `create_project_repo`: `raise HTTPException(status_code=502, detail=f"Could not create GitHub repo: {exc}")`
- `discord_callback`: `raise HTTPException(status_code=400, detail=f"Could not connect Discord account: {exc}")`
- `github_callback`: `raise HTTPException(status_code=400, detail=f"Could not connect GitHub account: {exc}")`

### Neden sorun

`requests` kütüphanesinin `HTTPError` mesajları genelde tam istek URL'sini içerir (örn. `"404 Client Error: Not Found for url: https://discord.com/api/v10/guilds/<GUILD_ID>/channels"`). Bu, `DISCORD_GUILD_ID` gibi iç yapılandırma detaylarını, hata anında API tüketicisine (proje sahibi kullanıcıya) sızdırıyor. Token'ların kendisi (Authorization header'da taşındığı için `requests`'in varsayılan hata mesajında yer almaz) sızmıyor, ama yine de gereğinden fazla iç detay ifşası.

### Doğrulama şekli

Kod okumasıyla tespit edildi (statik bulgu); bu denetim sırasında `create_discord_room` gerçek bot token'ıyla tetiklendi ama istek **başarılı** olduğu için hata mesajı gözlemlenemedi (bu test yan etkisi olarak gerçek bir Discord kanalı oluştu, denetim sonunda aynı bot token'ıyla silinip temizlendi).

### Önerilen çözüm

Bu dört yerde, `except Exception as exc:` bloklarında ham `{exc}`'i client'a döndürmek yerine: sunucu tarafında `print(...)` veya bir logger ile tam detayı logla, client'a ise sabit, genel bir mesaj dön (örn. `"Could not create Discord channel. Please try again later."`).

---

## 🟢 #9 — Metin alanlarında uzunluk (max_length) sınırı yok

**Kritiklik: DÜŞÜK**

### Sorun tam olarak nerede

`backend/schemas.py` içindeki `title`, `description`, `bio`, `content` gibi serbest metin alanlarının hepsi düz `str` / `Optional[str]` olarak tanımlı — hiçbirinde Pydantic `Field(max_length=...)` kısıtı yok (örn. `ProjectCreate.description`, `UserCreate.bio`, `ProjectCommentCreate.content`).

### Neden sorun

Kötü niyetli veya hatalı bir istemci, aşırı büyük payload'lar gönderip veritabanını şişirebilir ya da response boyutlarını (ör. proje listeleme) gereksiz büyütebilir. Acil bir çökme riski değil (aşağıda test edildi) ama savunma katmanı eksik.

### Canlı testle kanıtlandı

`POST /projects`'e 100.000 karakterlik bir `description` gönderildi → **200 OK**, çökme yok, ama herhangi bir üst sınır da uygulanmadı.

### Önerilen çözüm

`schemas.py`'deki ilgili alanlara makul `Field(max_length=...)` değerleri ekle (örn. `title` ~200, `description`/`bio` ~5000, `content`/`comment` ~2000 karakter — ürün ihtiyacına göre ayarlanabilir).

---

## 🟢 #10 — Takım arkadaşı e-postaları takım içi endpoint'lerde görünüyor

**Kritiklik: DÜŞÜK**

### Sorun tam olarak nerede

`backend/main.py` içinde `get_pending_feedback`, `create_discord_room`, `create_project_repo` fonksiyonlarının response'ları, ilgili kullanıcının kendi takım arkadaşlarının (aynı projede olan kişilerin) `email` alanını içeriyor.

### Neden düşük öncelikli

Bu bilgiyi görebilen kişi zaten o kullanıcıyla aynı projede birlikte çalışıyor — bağlam içinde makul bir paylaşım. Aksiyon gerektirmiyor, sadece "e-posta nerelerde dönüyor" envanterinde not edilmeye değer.

### Önerilen çözüm

Aksiyon gerekmiyor; ürün daha katı bir gizlilik politikası isterse ileride e-posta yerine sadece isim gösterilecek şekilde değiştirilebilir.

---

## ✅ İncelenip Sorun Bulunmayan Maddeler

Aşağıdakiler hem kod incelemesiyle hem canlı testlerle doğrulandı ve bir sorun tespit edilmedi:

- **SQL injection:** Tüm veritabanı erişimi SQLAlchemy ORM'in `db.query(...).filter(...)` deseniyle yapılıyor; kod tabanında (`main.py`, `models.py`, `database.py`) ham SQL (`.execute(`, `text(`, string birleştirme) kullanımı yok. `role`/`title` arama parametrelerine `' OR '1'='1`, `'; DROP TABLE users; --`, `%' OR 1=1 --` payload'ları canlı olarak gönderildi — hepsi literal arama string'i olarak işlendi, testler sonrası `users` tablosu bozulmadan sağlam kaldı.
- **Gerçek (sahte olmayan) token'larla yetkilendirme mantığı:** `delete_project`, `update_project`, `complete_project`, `delete_position`, `accept_application`, `reject_application`, `leave_team`, `update_user` — hepsi doğru sahiplik kontrolü yapıyor. Canlı testle doğrulandı: gerçek bir "saldırgan" hesabının gerçek token'ıyla kurbanın projesini silme/düzenleme ve başka bir kullanıcının profilini güncelleme denendi — üçü de **403** ile reddedildi.
- **Hassas veri sızıntısı (password_hash / github_access_token):** `schemas.py`'deki her response modeli ve `main.py`'deki her elle kurulan dict response tek tek tarandı — `password_hash` hiçbir yerde yok; `github_access_token` hiçbir yerde yok (yalnızca türetilmiş `github_connected: bool` dönüyor).
- **Var olmayan ID / 404 davranışı:** Test edilen tüm endpoint'lerde (`get_project`, `get_user_profile`, `delete_project`, `accept_application` vb.) var olmayan ID'ler temiz `404` JSON ile dönüyor, hiçbir yerde 500 gözlenmedi.
- **Debug/stack-trace sızıntısı:** `FastAPI(title="ErNord API")` debug modunda değil; ulaşabilen tüm hata yolları temiz JSON döndürdü, dosya yolu/traceback sızmadı.

---

## Önceliklendirme Önerisi

1. **#1** — tek başına diğer her şeyi anlamsız kılıyor, her şeyden önce bu
2. **#2, #3** — düşük efor / yüksek etki, hızlı kapatılabilir
3. **#4** — Discord/GitHub panel ayarlarını güncelledikten sonra ele alınabilir
4. **#5, #6, #7** — platformun büyüme aşamasına göre önceliklendirilebilir
5. **#8, #9, #10** — acil değil, cilalama işi
