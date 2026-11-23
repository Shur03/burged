# Vercel дээр Turso ашиглах

Vercel нь Turso Cloud дахь libSQL сантай HTTPS-ээр холбогдоно. Локал болон VPS дээр `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` тохируулаагүй үед SQLite файл ашиглана.

## 1. SQLite нөөц гаргах

Шилжүүлэх хүртэл хуучин сайтаар шинэ захиалга бүртгэх, бараа засах үйлдлийг түр зогсооно. Төслийн локал сангаас шинэ нөөц үүсгэнэ.

```powershell
node scripts/sqlite-backup.mjs backup .door-data/doors.sqlite .door-data/exports
```

Энэ командаас хэвлэсэн нөөцийн замыг доорх жишээн дэх `SNAPSHOT.sqlite`-ийн оронд хэрэглэнэ. Turso-д өвөрмөц нэр үүсгэхийн тулд нөөцийн баталгаажсан хуулбарыг `.db` өргөтгөлтэй бэлтгэнэ. SQLite файлд захиалагчийн мэдээлэл байгаа тул хувийн хавтас болон өөрийн Turso байгууллагын өгөгдлийн санд хадгална.

```powershell
node scripts/sqlite-backup.mjs restore .door-data/exports/SNAPSHOT.sqlite .door-data/exports/burged-migration.db
```

Хэрэв бэлдсэн огноотой `burged-migration-YYYYMMDD.db` нөөцийг ашиглавал дараагийн алхмууд дахь файлын нэр болон Turso сангийн нэрийг түүнд тааруулна.

Шинээр бэлдсэн импортын хуулбарыг Turso-ийн шаарддаг WAL горимд оруулж, өөрчлөлтийг үндсэн файлд нэгтгэнэ. Доорх командын файлын нэрийг өөрийн хуулбараар солино. Бэлдсэн `burged-migration-20261123.db` файл энэ шалгалтыг давсан.

```powershell
node -e "const db = new (require('node:sqlite').DatabaseSync)(process.argv[1]); console.log(db.prepare('PRAGMA journal_mode=WAL').get()); console.log(db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get()); db.close();" .door-data/exports/burged-migration.db
```

## 2. Turso руу оруулж баталгаажуулах

Turso Cloud-ийн шинэчилсэн CLI ашиглан өөрийн байгууллагад нэвтэрч, нөөцийг оруулна. Жишээ команд `burged-migration` нэртэй сан үүсгэнэ.

```text
turso auth login
turso db import .door-data/exports/burged-migration.db
turso db show burged-migration --url
turso db tokens create burged-migration
```

Гарсан URL болон токеныг төслийн локал `.env.turso.local` файлд `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` нэрээр оруулж, доорх командыг ажиллуулна. Скрипт эх файлтай бүх бараа, захиалга, зургийн өгөгдлийг тулгаж, тоог хэвлэнэ. Тулгалт амжилттай болсны дараа production руу шилжинэ. `.env.turso.local` төслийн Git-д орохгүй.

```powershell
node --env-file=.env.turso.local scripts/verify-turso.mjs .door-data/exports/burged-migration.db
```

[Turso-ийн SQLite импортын заавар](https://turso.tech/blog/migrating-and-importing-sqlite-to-turso-just-got-easier)

## 3. Vercel тохируулах

Vercel төслийн **Settings → Environment Variables** хэсэгт `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`-ийг серверийн хувьсагчаар нэмнэ. `DOOR_ADMIN_PASSWORD`, `DOOR_BANK_ACCOUNT` болон ашиглаж буй бусад төлбөрийн тохиргоог нэмж шалгана. Төлбөрийн sandbox ашиглаж байвал одоогийн HTTPS домэйн дээрх QPay callback хаягийг тохируулна. Preview орчинд тестийн өгөгдөлтэй тусдаа Turso сан ашиглана.

Turso холболт орсон commit-оо Vercel-ийн production branch руу push хийнэ. Уг commit аль хэдийн Vercel дээр байршсан бол түүний deployment дээр **Redeploy** сонгоно. Production URL-аар каталог, өмнөх зургууд, админы захиалгын жагсаалт болон олон зураг оруулах үйлдлийг шалгана. Олон зураг оруулахад том зургууд браузерт шахагдаж, 8 хүртэл зургийн өгөгдөл нийт 3 МиБ дотор багтана. Импортын шалгалтаар өмнөх зургуудын байтыг эх файлтай тулгана.

Эх SQLite файл болон шилжүүлсэн нөөцөө хувийн газарт хадгална. Production нээгдсэний дараа шинээр бүртгэгдсэн захиалгууд Turso санд хадгалагдана.
