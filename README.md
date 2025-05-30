# 🃏 Italian Card Game - Gioco di Carte Italiane

Un'applicazione multiplayer in tempo reale per giocare con un mazzo di carte italiane tradizionale da 40 carte.

## 🌐 Demo Live

**Prova subito l'applicazione:** [cards.tommasolopiparo.com](https://cards.tommasolopiparo.com)

Nessuna installazione richiesta! Apri il link, crea o entra in una stanza e inizia a giocare con i tuoi amici.

## ✨ Caratteristiche

- **Multiplayer in tempo reale** con Socket.IO
- **Mazzo italiano tradizionale** da 40 carte (1-7, Fante, Regina, Re in 4 semi)
- **Sistema di stanze** con protezione tramite codice
- **Privilegi dell'host** per la gestione del mazzo
- **Cronologia delle carte pescate**
- **Interfaccia web moderna e responsive**
- **Semi tradizionali**: Coppe ♥, Denari ♦, Spade ♠, Bastoni ♣

## 🚀 Come iniziare

### Prerequisiti
- Node.js (versione 14 o superiore)
- npm o yarn

### Installazione
1. Clona o scarica il progetto
2. Installa le dipendenze:
   ```bash
   npm install
   ```

### Avvio dell'applicazione
```bash
# Metodo standard
npm start

# Avvio automatico con ricerca porta disponibile (Windows)
npm run dev:auto

# Oppure usa i file di avvio diretti
.\start.ps1        # PowerShell
start.bat          # Batch file
```

L'applicazione sarà disponibile su `http://localhost:3000` (o sulla prima porta disponibile)

## 🎮 Come giocare

### Creare una stanza
1. Clicca su "Crea Stanza"
2. Inserisci il tuo nome
3. Opzionalmente, imposta un codice per la stanza
4. Clicca "Crea Stanza"

### Entrare in una stanza
1. Clicca su "Entra in Stanza"
2. Inserisci il tuo nome
3. Inserisci l'ID della stanza
4. Se richiesto, inserisci il codice
5. Clicca "Entra"

### Giocare
- **Pescare una carta**: Clicca "Pesca Carta" o premi la barra spaziatrice
- **Rimescolare il mazzo** (solo host): Clicca "Rimescola"
- **Visualizzare la cronologia**: Guarda il pannello "Cronologia" a destra
- **Vedere i giocatori**: Visualizza tutti i giocatori connessi nel pannello "Giocatori Online"

## 🏗️ Architettura

### Backend (server.js)
- **Express.js** per il server web
- **Socket.IO** per la comunicazione in tempo reale
- **Gestione delle stanze** con Map per prestazioni ottimali
- **Algoritmo Fisher-Yates** per mescolare le carte
- **UUID** per identificatori unici

### Frontend
- **HTML5** con struttura moderna
- **CSS3** con design responsive e animazioni
- **JavaScript ES6+** con Socket.IO client
- **Design mobile-first**

### Caratteristiche tecniche
- Gestione automatica della disconnessione
- Trasferimento automatico dei privilegi dell'host
- Validazione dei dati lato client e server
- Gestione degli errori robusta
- Interfaccia accessibile

## 🃏 Il Mazzo di Carte

Il mazzo tradizionale italiano include 40 carte:

**Semi (4):**
- Coppe ♥ (rosso)
- Denari ♦ (rosso)  
- Spade ♠ (nero)
- Bastoni ♣ (nero)

**Valori per seme (10):**
- Numeriche: 1, 2, 3, 4, 5, 6, 7
- Figure: Fante (J), Regina (Q), Re (K)

## 🔧 Configurazione

### Variabili d'ambiente
- `PORT`: Porta del server (default: 3000)

### Deploy su server
Per il deploy dettagliato su server (come Ionos), consulta il file `DEPLOYMENT.md`.

Comandi rapidi:
```bash
# Carica i file sul server
# Installa le dipendenze
npm install --production

# Avvia con PM2 (raccomandato per produzione)
npm install -g pm2
pm2 start server.js --name "italian-cards"
pm2 startup
pm2 save
```

## 📱 Funzionalità

- **Responsive design** - Funziona su desktop, tablet e mobile
- **Scorciatoie da tastiera** - Barra spaziatrice per pescare, ESC per chiudere i modal
- **Animazioni fluide** - Effetti di transizione per le carte
- **Notifiche in tempo reale** - Aggiornamenti istantanei per tutti i giocatori
- **Gestione degli errori** - Messaggi di errore chiari e informativi

## 🛠️ Sviluppo

### Struttura del progetto
```
italian-card-game/
├── server.js              # Server principale
├── package.json           # Dipendenze e script
├── public/                # File statici
│   ├── index.html         # Interfaccia principale
│   ├── style.css          # Stili CSS
│   └── app.js             # JavaScript client
├── .github/
│   └── copilot-instructions.md
└── README.md
```

### Script disponibili
- `npm start` - Avvia il server in produzione
- `npm run dev` - Avvia il server in modalità sviluppo

## 📄 Licenza

ISC License - Vedi file LICENSE per i dettagli.

## 🤝 Contributi

I contributi sono benvenuti! Per favore:
1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 🐛 Segnalazione Bug

Per segnalare bug o richiedere nuove funzionalità, apri una issue nel repository.

## 📞 Supporto

Per supporto o domande, contatta il maintainer del progetto.

---

**Buon divertimento con le carte italiane! 🃏🇮🇹**
