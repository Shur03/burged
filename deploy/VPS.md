# Бүргэд хаалгыг VPS дээр ажиллуулах

Энэ тохиргоо нь Ubuntu/Debian VPS, systemd, Node.js 24, Caddy дээр ажиллана. Next.js нь `127.0.0.1:3000` дээр, Caddy домэйны HTTP/HTTPS портууд дээр ажиллана. Бараа, байршуулсан зураг, захиалгын мэдээлэл `/var/lib/khaalga/doors.sqlite` санд хадгалагдана.

## 1. Файлуудаа шилжүүлэх

Локал төслийн PowerShell-оос кодын ZIP болон баталгаажуулсан SQLite нөөцийг SSH-ээр VPS-ийн хувийн хавтас руу хуулна. Жишээ дэх хэрэглэгч, сервер болон нөөцийн файлын нэрийг солино.

```powershell
ssh deployuser@VPS_IP "install -d -m 0700 ~/khaalga-transfer"
scp .door-data/exports/khaalga-vps-source.zip .door-data/exports/doors-YYYY-MM-DDTHH-MM-SS-msZ.sqlite deployuser@VPS_IP:~/khaalga-transfer/
```

SQLite файлд захиалагчийн мэдээлэл агуулагдана. Файлыг хувийн хадгалалт болон SSH ашиглан дамжуулна. Шилжилтийн үед хуучин сайтаар шинэ захиалга авдаг бол бичилтийг түр зогсоож, хамгийн сүүлийн нөөцийг үүсгээд шилжүүлнэ.

Локал ажиллагаатай сангаас дахин хуулбар авах команд:

```powershell
node scripts/sqlite-backup.mjs backup .door-data/doors.sqlite .door-data/exports
```

## 2. VPS бэлдэх

Node.js 24, npm, unzip болон Caddy суусан байна. Unit файлууд `/usr/bin/node` ашигладаг. Node өөр замд байрласан бол хоёр service файлын `ExecStart`-ийг тухайн абсолют замаар солино.

```bash
/usr/bin/node --version
npm --version
caddy version
getent passwd khaalga >/dev/null || sudo useradd --system --user-group --home-dir /var/lib/khaalga --shell /usr/sbin/nologin khaalga
sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 0755 /opt/khaalga
sudo install -d -o khaalga -g khaalga -m 0750 /var/lib/khaalga
sudo install -d -o khaalga -g khaalga -m 0700 /var/backups/khaalga
sudo install -d -m 0750 /etc/khaalga
umask 022
unzip "$HOME/khaalga-transfer/khaalga-vps-source.zip" -d /opt/khaalga
cd /opt/khaalga
npm ci
npm run build
sudo install -d -o khaalga -g khaalga -m 0750 /opt/khaalga/.next/cache
```

Серверийн тохиргоог root хэрэглэгчийн унших эрхтэй файлд хадгална.

```bash
sudo install -m 0600 deploy/app.env.example /etc/khaalga/app.env
sudoedit /etc/khaalga/app.env
```

`DOOR_ADMIN_PASSWORD`-д 16-аас дээш тэмдэгттэй нууц үг оруулна. `DOOR_BANK_ACCOUNT`-ыг шалгаж, банк болон данс эзэмшигчийн нэрийг хүсвэл нэмнэ. QPay sandbox ашиглах тестийн серверт sandbox утгууд болон тухайн HTTPS домэйнтэй callback замыг тохируулна.

## 3. SQLite санг оруулж сайтыг асаах

Үйлчилгээг асаахаас өмнө нөөцөө шалгаад сэргээнэ. Команд дахь файлын нэрийг өөрийн хуулсан нөөцийн нэрээр солино.

```bash
SNAPSHOT="$HOME/khaalga-transfer/doors-YYYY-MM-DDTHH-MM-SS-msZ.sqlite"
node scripts/sqlite-backup.mjs verify "$SNAPSHOT" &&
sudo install -m 0600 -o khaalga -g khaalga "$SNAPSHOT" /var/lib/khaalga/import.sqlite &&
sudo -u khaalga /usr/bin/node scripts/sqlite-backup.mjs restore /var/lib/khaalga/import.sqlite /var/lib/khaalga/doors.sqlite &&
sudo rm /var/lib/khaalga/import.sqlite
```

Сэргээх команд амжилттай дууссаны дараа үйлчилгээг асаана.

```bash
sudo install -m 0644 deploy/systemd/khaalga.service deploy/systemd/khaalga-backup.service deploy/systemd/khaalga-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now khaalga.service
curl -f http://127.0.0.1:3000/
```

Restore команд өмнө нь сан эсвэл SQLite-ийн нэмэлт файл байгаа зам дээр зогсоно. Хуучин санг солих шаардлагатай бол доорх сэргээх хэсгийг дагана. Хэрэв сэргээх команд алдаа өгвөл `import.sqlite`-ийг хадгалж, алдааг зассаны дараа дараагийн командыг ажиллуулна.

Домэйны DNS `A` бичлэгийг VPS-ийн IPv4 хаяг руу заана. IPv6 ашигладаг бол `AAAA` бичлэгээ мөн тохируулна. 80, 443 портыг Caddy-д нээнэ. `deploy/Caddyfile.example` дахь блокийг өөрийн домэйнээр солиод `/etc/caddy/Caddyfile`-д нэмнэ.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
curl -f https://shop.example.com/
```

Каталогийн зураг ачаалж байгаа эсэх, админ нэвтрэлт болон шилжүүлсэн захиалга харагдаж буйг домэйноор шалгана.

## 4. Өдөр тутмын нөөцлөлт

```bash
sudo systemctl start khaalga-backup.service
sudo systemctl enable --now khaalga-backup.timer
systemctl list-timers khaalga-backup.timer
sudo journalctl -u khaalga-backup.service -n 20
sudo ls -lh /var/backups/khaalga
```

Timer нь Улаанбаатарын цагаар өдөр бүр **03:00**-д ажиллана. Сервер унтарснаас ажиллаагүй өдөр байвал дараагийн асаалтаар нөхөж ажиллана. SQLite-ийн online backup-аар ажиллаж буй сайтаас хуулбар авч, integrity болон foreign key шалгалт хийсний дараа нөөцийг хадгална. Амжилттай шинэ нөөц үүссэний дараа 30 хоногоос хуучирсан нөөц файлуудыг цэвэрлэнэ.

`/var/backups/khaalga` дахь хуулбараас гадна VPS-ээс тусдаа диск эсвэл хувийн хадгалалтад нөөц хуулж байвал серверийн диск эвдэрсэн үед сэргээх боломжтой. Энэ timer нь VPS дээрх нөөцлөлтийг ажиллуулна.

## 5. Нөөцөөс сэргээх

Сэргээх үед сайтаа зогсооно. Эхлээд сонгосон нөөцөө `verify` командаар шалгаж, тусдаа замд сэргээнэ. Одоо ашиглагдаж байгаа `doors.sqlite` болон байвал `doors.sqlite-wal`, `doors.sqlite-shm`, `doors.sqlite-journal` файлуудаа хамтад нь хувийн архивын хавтас руу шилжүүлсний дараа баталгаажсан сэргээсэн файлаа `doors.sqlite` нэрээр байрлуулна. Файл `khaalga` хэрэглэгчийн эзэмшилд, `0600` эрхтэй байна. Сайтаа асааж, хуучин захиалга болон зургуудыг шалгана.

```bash
cd /opt/khaalga
sudo systemctl stop khaalga-backup.timer khaalga-backup.service khaalga.service
sudo -u khaalga /usr/bin/node scripts/sqlite-backup.mjs verify /var/backups/khaalga/doors-YYYY-MM-DDTHH-MM-SS-msZ.sqlite
sudo -u khaalga /usr/bin/node scripts/sqlite-backup.mjs restore /var/backups/khaalga/doors-YYYY-MM-DDTHH-MM-SS-msZ.sqlite /var/lib/khaalga/restored.sqlite
# Move the previous database and any sidecars to a private archive before promoting restored.sqlite.
sudo -u khaalga ln /var/lib/khaalga/restored.sqlite /var/lib/khaalga/doors.sqlite &&
sudo rm /var/lib/khaalga/restored.sqlite &&
sudo systemctl start khaalga.service khaalga-backup.timer
```
