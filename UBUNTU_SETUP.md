# Kickbase Helper - Ubuntu 24.04 Setup Anleitung

Diese Anleitung führt dich durch die komplette Installation und Einrichtung des Kickbase Helper Servers auf einem frischen Ubuntu 24.04 System.

## 📋 Voraussetzungen

- Frisches Ubuntu 24.04 LTS System
- Root- oder sudo-Zugriff
- Internetverbindung
- Kickbase API Key

## 🚀 Installation

### 1. System aktualisieren

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Node.js und npm installieren

```bash
# Node.js 20.x LTS installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Versionen überprüfen
node --version  # sollte v20.x.x anzeigen
npm --version   # sollte 10.x.x anzeigen
```

### 3. Git installieren

```bash
sudo apt install git -y
```

### 4. Repository klonen

#### Option A: HTTPS mit Personal Access Token (empfohlen)

```bash
# In das gewünschte Verzeichnis wechseln (z.B. /opt oder /home/user)
cd /opt

# Repository klonen mit Personal Access Token
# Ersetze YOUR_TOKEN mit deinem GitHub Personal Access Token
sudo git clone https://YOUR_TOKEN@github.com/Pisoko/kickbasehelper.git
cd kickbasehelper

# Berechtigung setzen (falls nötig)
sudo chown -R $USER:$USER /opt/kickbasehelper
```

**Personal Access Token erstellen:**
1. Gehe zu GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klicke "Generate new token (classic)"
3. Wähle Scope: `repo` (für private Repos) oder `public_repo` (für öffentliche Repos)
4. Kopiere den generierten Token

#### Option B: SSH (für fortgeschrittene Benutzer)

```bash
# SSH Key generieren (falls noch nicht vorhanden)
ssh-keygen -t ed25519 -C "deine-email@example.com"

# SSH Key zu GitHub hinzufügen
cat ~/.ssh/id_ed25519.pub
# Kopiere den Output und füge ihn in GitHub → Settings → SSH Keys hinzu

# Repository mit SSH klonen
cd /opt
sudo git clone git@github.com:Pisoko/kickbasehelper.git
cd kickbasehelper

# Berechtigung setzen (falls nötig)
sudo chown -R $USER:$USER /opt/kickbasehelper
```

#### Option C: Public Repository (ohne Authentifizierung)

```bash
# Falls das Repository öffentlich ist, funktioniert auch:
cd /opt
sudo git clone https://github.com/Pisoko/kickbasehelper.git
cd kickbasehelper

# Berechtigung setzen (falls nötig)
sudo chown -R $USER:$USER /opt/kickbasehelper
```

**Hinweis:** GitHub unterstützt keine Passwort-Authentifizierung mehr für Git-Operationen. Du musst einen Personal Access Token oder SSH Keys verwenden.

### 5. Dependencies installieren

```bash
npm install
```

### 6. Umgebungsvariablen konfigurieren

```bash
# .env Datei erstellen
cp .env.example .env  # falls vorhanden, sonst:
nano .env
```

Füge folgende Inhalte in die `.env` Datei ein:

```env
# Kickbase API Configuration
KICKBASE_API_KEY=dein_kickbase_api_key_hier

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional: Weitere Konfigurationen
NODE_ENV=production
PORT=3000
```

**Wichtig:** Ersetze `dein_kickbase_api_key_hier` mit deinem echten Kickbase API Key.

### 7. Anwendung bauen

```bash
npm run build
```

## 🏃‍♂️ Server starten

### Option 1: Development Server (für Tests)

```bash
npm run dev
```

Der Server läuft dann auf: `http://localhost:3000`

### Option 2: Production Server

```bash
npm start
```

### Option 3: Mit PM2 (empfohlen für Production)

```bash
# PM2 global installieren
sudo npm install -g pm2

# Anwendung mit PM2 starten
pm2 start npm --name "kickbase-helper" -- start

# PM2 Auto-Start beim Systemstart aktivieren
pm2 startup
pm2 save
```

## 🔧 Systemd Service (Alternative zu PM2)

Für eine robuste Production-Umgebung kannst du einen systemd Service erstellen:

### 1. Service-Datei erstellen

```bash
sudo nano /etc/systemd/system/kickbase-helper.service
```

### 2. Service-Konfiguration

```ini
[Unit]
Description=Kickbase Helper Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/kickbasehelper
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Service aktivieren und starten

```bash
# Service neu laden
sudo systemctl daemon-reload

# Service aktivieren (Auto-Start)
sudo systemctl enable kickbase-helper

# Service starten
sudo systemctl start kickbase-helper

# Status überprüfen
sudo systemctl status kickbase-helper
```

## 🌐 Reverse Proxy mit Nginx (Optional)

Für Production empfiehlt sich ein Reverse Proxy:

### 1. Nginx installieren

```bash
sudo apt install nginx -y
```

### 2. Nginx-Konfiguration

```bash
sudo nano /etc/nginx/sites-available/kickbase-helper
```

```nginx
server {
    listen 80;
    server_name deine-domain.com;  # Ersetze mit deiner Domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Nginx aktivieren

```bash
# Konfiguration aktivieren
sudo ln -s /etc/nginx/sites-available/kickbase-helper /etc/nginx/sites-enabled/

# Nginx testen und neu starten
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Firewall konfigurieren

```bash
# UFW aktivieren
sudo ufw enable

# HTTP und HTTPS erlauben
sudo ufw allow 'Nginx Full'

# SSH erlauben (wichtig!)
sudo ufw allow ssh

# Status überprüfen
sudo ufw status
```

## 📊 Monitoring und Logs

### Logs anzeigen

```bash
# PM2 Logs
pm2 logs kickbase-helper

# Systemd Logs
sudo journalctl -u kickbase-helper -f

# Nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### PM2 Monitoring

```bash
# PM2 Status
pm2 status

# PM2 Monitoring Dashboard
pm2 monit
```

## 🔄 Updates und Wartung

### Anwendung aktualisieren

```bash
cd /opt/kickbasehelper

# Neueste Änderungen holen
# Falls du einen Personal Access Token verwendest:
git pull origin main

# Falls du SSH verwendest, stelle sicher dass der SSH Agent läuft:
# eval "$(ssh-agent -s)"
# ssh-add ~/.ssh/id_ed25519

# Dependencies aktualisieren
npm install

# Neu bauen
npm run build

# Service neu starten
pm2 restart kickbase-helper
# oder
sudo systemctl restart kickbase-helper
```

**Hinweis für Updates:** Falls du Authentifizierungsprobleme beim `git pull` hast, überprüfe:
- Personal Access Token ist noch gültig
- SSH Key ist korrekt konfiguriert
- Repository-URL ist korrekt gesetzt: `git remote -v`

### Backup erstellen

```bash
# Backup-Verzeichnis erstellen
sudo mkdir -p /backup/kickbase-helper

# Anwendung und Konfiguration sichern
sudo tar -czf /backup/kickbase-helper/backup-$(date +%Y%m%d).tar.gz \
  /opt/kickbasehelper \
  /etc/systemd/system/kickbase-helper.service \
  /etc/nginx/sites-available/kickbase-helper
```

## 🐛 Troubleshooting

### Häufige Probleme

1. **Git-Authentifizierung fehlgeschlagen**
   ```bash
   # Fehler: "Invalid username or token" oder "Password authentication is not supported"
   
   # Lösung 1: Personal Access Token verwenden
   git remote set-url origin https://YOUR_TOKEN@github.com/Pisoko/kickbasehelper.git
   
   # Lösung 2: SSH verwenden
   git remote set-url origin git@github.com:Pisoko/kickbasehelper.git
   
   # Aktuelle Remote-URL überprüfen
   git remote -v
   ```

2. **Port bereits in Verwendung**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

3. **Berechtigungsprobleme**
   ```bash
   sudo chown -R $USER:$USER /opt/kickbasehelper
   ```

4. **Node.js Version**
   ```bash
   node --version  # sollte >= 18.0.0 sein
   ```

5. **Logs überprüfen**
   ```bash
   pm2 logs kickbase-helper --lines 50
   ```

### Nützliche Befehle

```bash
# Anwendung stoppen
pm2 stop kickbase-helper

# Anwendung neu starten
pm2 restart kickbase-helper

# PM2 Prozesse löschen
pm2 delete kickbase-helper

# System-Ressourcen überprüfen
htop
df -h
free -h
```

## ✅ Erfolgreich eingerichtet!

Nach erfolgreicher Installation sollte deine Kickbase Helper Anwendung unter folgenden URLs erreichbar sein:

- **Lokal**: `http://localhost:3000`
- **Mit Domain**: `http://deine-domain.com`

Die Anwendung läuft jetzt stabil im Hintergrund und startet automatisch beim Systemstart neu.

## 📞 Support

Bei Problemen überprüfe:
1. Logs der Anwendung
2. Systemd/PM2 Status
3. Nginx Konfiguration (falls verwendet)
4. Firewall-Einstellungen
5. API Key Konfiguration

---

**Viel Erfolg mit deinem Kickbase Helper! ⚽**