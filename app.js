// ==========================================
// INIEZIONE DINAMICA DEL CSS INTERNO
// ==========================================
(function iniettaCSS() {
    const stile = document.createElement('style');
    stile.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; user-select: none; }
        body, html { width: 100%; height: 100%; overflow: hidden; background-color: #13111c; }
        .screen { position: absolute; width: 100%; height: 100%; display: none; justify-content: center; align-items: center; z-index: 10; }
        .screen.active { display: flex; }
        #screen-game { justify-content: flex-start; align-items: flex-start; }
        #game3d-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; }
        #live-score-ui { position: absolute; top: 20px; left: 20px; font-size: 28px; font-weight: 900; color: #ffaa00; text-shadow: 2px 2px 0px #000; z-index: 5; font-family: monospace; letter-spacing: 2px; display: none; }
        .menu-box { background: rgba(15, 12, 28, 0.90); border: 3px solid #ffaa00; border-radius: 16px; padding: 25px; width: 92%; max-width: 440px; text-align: center; box-shadow: 0 0 30px rgba(255, 170, 0, 0.25); backdrop-filter: blur(8px); z-index: 20; color: #fff; }
        .menu-box h1 { font-size: 30px; color: #ffaa00; margin-bottom: 8px; letter-spacing: 1px; text-shadow: 0 0 10px rgba(255,170,0,0.4); }
        .menu-box h2 { font-size: 34px; margin-bottom: 12px; letter-spacing: 2px; }
        .text-danger { color: #ff3333; text-shadow: 0 0 10px rgba(255,51,51,0.4); }
        .menu-box p { color: #aaa; font-size: 13px; margin-bottom: 15px; }
        input[type="text"] { width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 2px solid #444; border-radius: 8px; color: #fff; font-size: 16px; text-align: center; margin-bottom: 15px; outline: none; transition: 0.2s; }
        input[type="text"]:focus { border-color: #ffaa00; background: rgba(255,255,255,0.1); }
        button { width: 100%; padding: 14px; background: #ffaa00; border: none; border-radius: 8px; color: #0f0c1c; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        button:hover { background: #ffbb33; transform: scale(1.02); }
        .score-summary { font-size: 20px; color: #fff; margin-bottom: 20px; }
        .highlight { color: #ffaa00; font-weight: bold; font-size: 28px; }
        #leaderboard-container { margin-top: 20px; border-top: 2px dashed rgba(255,255,255,0.1); padding-top: 15px; max-height: 260px; overflow-y: auto; }
        #leaderboard-container h3 { font-size: 15px; color: #ffaa00; margin-bottom: 10px; letter-spacing: 1px; }
        #leaderboard-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        #leaderboard-table th { color: #777; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-transform: uppercase; font-size: 11px; }
        #leaderboard-table td { padding: 7px 8px; color: #ddd; border-bottom: 1px solid rgba(255,255,255,0.04); }
        #leaderboard-table tr:last-child td { border-bottom: none; }
    `;
    document.head.appendChild(stile);
})();

// ==========================================
// CONFIGURAZIONE E INIZIALIZZAZIONE FIREBASE
// ==========================================
const firebaseConfig = {
    databaseURL: "https://f1-game-classifica-default-rtdb.europe-west1.firebasedatabase.app/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ==========================================
// STATO DELL'APPLICAZIONE
// ==========================================
let attualeNickname = "";
let attualePunteggio = 0;

window.onload = function() {
    const nomeSalvato = localStorage.getItem("nicknameGioco");
    if (nomeSalvato) {
        document.getElementById("nickname-input").value = nomeSalvato;
    }
    init3D(); 
    aggiornaClassificaVisiva(); 
}

function cambiaSchermata(idSchermataVecchia, idSchermataNuova) {
    const vecchia = document.getElementById(idSchermataVecchia);
    const nuova = document.getElementById(idSchermataNuova);
    if (vecchia) vecchia.classList.remove("active");
    if (nuova) nuova.classList.add("active");
}

function ritornaAllaHome() {
    aggiornaClassificaVisiva();
    cambiaSchermata("screen-gameover", "screen-home");
}

// ==========================================
// LOGICA DELLA CLASSIFICA DINAMICA (TOP 10 + TU)
// ==========================================
function aggiornaClassificaVisiva() {
    const leaderboardBody = document.getElementById("leaderboard-body");
    if (!leaderboardBody) return;

    const mioNickname = localStorage.getItem("nicknameGioco") || "";

    database.ref("classifica").orderByChild("punti").once("value", (snapshot) => {
        let listaGiocatori = [];
        
        snapshot.forEach((childSnapshot) => {
            listaGiocatori.push({
                nickname: childSnapshot.key,
                punti: childSnapshot.val().punti
            });
        });

        listaGiocatori.reverse();
        leaderboardBody.innerHTML = "";

        if (listaGiocatori.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nessun record salvato. Sii il primo!</td></tr>`;
            return;
        }

        let utenteTrovatoNeiTop10 = false;
        let miaPosizioneGenerale = -1;
        let mieiPuntiGenerali = 0;

        const limiteTop = Math.min(listaGiocatori.length, 10);
        for (let i = 0; i < limiteTop; i++) {
            const giocatore = listaGiocatori[i];
            const posizione = i + 1;
            let stileRiga = "";

            if (giocatore.nickname.toLowerCase() === mioNickname.toLowerCase()) {
                stileRiga = 'style="background: rgba(255, 170, 0, 0.25); font-weight: bold; color: #ffaa00;"';
                utenteTrovatoNeiTop10 = true;
            }

            leaderboardBody.innerHTML += `
                <tr ${stileRiga}>
                    <td>${posizione}</td>
                    <td>${giocatore.nickname}</td>
                    <td>${giocatore.punti}</td>
                </tr>
            `;
        }

        if (!utenteTrovatoNeiTop10 && mioNickname !== "") {
            for (let i = 10; i < listaGiocatori.length; i++) {
                if (listaGiocatori[i].nickname.toLowerCase() === mioNickname.toLowerCase()) {
                    miaPosizioneGenerale = i + 1;
                    mieiPuntiGenerali = listaGiocatori[i].punti;
                    break;
                }
            }

            if (miaPosizioneGenerale > 10) {
                leaderboardBody.innerHTML += `
                    <tr style="background: transparent;"><td colspan="3" style="text-align:center; padding: 2px; color: #888;">...</td></tr>
                    <tr style="background: rgba(0, 180, 255, 0.2); font-weight: bold; color: #00b4ff;">
                        <td>${miaPosizioneGenerale}</td>
                        <td>${mioNickname} (Tu)</td>
                        <td>${mieiPuntiGenerali}</td>
                    </tr>
                `;
            }
        }
    });
}

function salvaPunteggioOnline(nickname, punti) {
    if (!nickname) return;
    const utenteRef = database.ref("classifica/" + nickname);
    
    utenteRef.once("value", (snapshot) => {
        if (snapshot.exists()) {
            const recordPrecedente = snapshot.val().punti;
            if (punti > recordPrecedente) {
                utenteRef.set({ punti: punti, timestamp: Date.now() });
            }
        } else {
            utenteRef.set({ punti: punti, timestamp: Date.now() });
        }
    });
}

// ==========================================
// MOTORE 3D (THREE.JS) - CONFIGURAZIONE
// ==========================================
let scena, telecamera, renderer;
let auto3D;
let ostacoli3D = [];
let lineeStrada = [];
let giocoAttivo = false;
let matStrada; 
let gruppoStelle; 

const VELOCITA_INIZIALE = 0.4;
let velocitaGioco = VELOCITA_INIZIALE;
let spawnTimer = 0;
let frequenzaSpawnAttuale = 40; 

const LARGHEZZA_STRADA = 6;  
const LIMITE_X = 2.2;        

let ultimoXIniziale = 0;
let autoXIniziale = 0;

function generaTextureAsfalto() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111113'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512; const y = Math.random() * 512;
        const coloreGrana = Math.random() > 0.5 ? 20 : 4;
        ctx.fillStyle = `rgba(${coloreGrana},${coloreGrana},${coloreGrana}, 0.15)`;
        ctx.fillRect(x, y, 1.5, 1.5);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 30);
    return texture;
}

function creaCupolaCielo() {
    const geoCielo = new THREE.SphereGeometry(150, 32, 15);
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradiente = ctx.createLinearGradient(0, 0, 0, 128);
    gradiente.addColorStop(0, '#040610'); gradiente.addColorStop(0.4, '#0c1224');
    gradiente.addColorStop(0.7, '#1f162b'); gradiente.addColorStop(1, '#2c1e29');
    ctx.fillStyle = gradiente; ctx.fillRect(0, 0, 1, 128);
    const textureCielo = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(geoCielo, new THREE.MeshBasicMaterial({ map: textureCielo, side: THREE.BackSide, depthWrite: false }));
}

function creaSistemaStelle() {
    gruppoStelle = new THREE.Group();
    const geoStella = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const matStella = new THREE.MeshBasicMaterial({ color: 0xaa99ff, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 120; i++) {
        const stella = new THREE.Mesh(geoStella, matStella);
        const angolo = Math.random() * Math.PI * 2; const raggio = 90 + Math.random() * 40;
        stella.position.x = Math.cos(angolo) * raggio; stella.position.z = Math.sin(angolo) * raggio - 40;
        stella.position.y = 5 + Math.random() * 45; 
        gruppoStelle.add(stella);
    }
    return gruppoStelle;
}

function init3D() {
    const container = document.getElementById("game3d-container");
    if (!container) return;

    scena = new THREE.Scene();
    scena.background = new THREE.Color(0x13111c);
    scena.fog = new THREE.FogExp2(0x13111c, 0.016);

    telecamera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
    telecamera.position.set(0, 4.6, 6.0); 
    telecamera.lookAt(0, 0.3, -8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    scena.add(creaCupolaCielo());
    scena.add(creaSistemaStelle());

    scena.add(new THREE.AmbientLight(0xffffff, 0.25));
    
    const luceSole = new THREE.DirectionalLight(0xfff5eb, 1.1);
    luceSole.position.set(12, 25, 8); 
    luceSole.castShadow = true;
    luceSole.shadow.mapSize.width = 2048; 
    luceSole.shadow.mapSize.height = 2048; 
    luceSole.shadow.bias = -0.0005;
    scena.add(luceSole);
    
    scena.add(new THREE.HemisphereLight(0x556688, 0x18121e, 0.5));

    matStrada = new THREE.MeshStandardMaterial({ map: generaTextureAsfalto(), roughness: 0.85, metalness: 0.1 });
    const strada = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA_STRADA, 200), matStrada);
    strada.rotation.x = -Math.PI / 2; strada.receiveShadow = true; scena.add(strada);

    const matLineaBordo = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6, metalness: 0.1 });
    const geoLineaBordo = new THREE.BoxGeometry(0.12, 0.008, 200);
    const lineaSxs = new THREE.Mesh(geoLineaBordo, matLineaBordo); lineaSxs.position.set(-LARGHEZZA_STRADA/2 + 0.15, 0.004, 0); lineaSxs.receiveShadow = true; scena.add(lineaSxs);
    const lineaDxs = new THREE.Mesh(geoLineaBordo, matLineaBordo); lineaDxs.position.set(LARGHEZZA_STRADA/2 - 0.15, 0.004, 0); lineaDxs.receiveShadow = true; scena.add(lineaDxs);

    const geoTratto = new THREE.BoxGeometry(0.08, 0.01, 3);
    const matTratto = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.5, metalness: 0.0 });
    for (let i = 0; i < 20; i++) {
        let tratto = new THREE.Mesh(geoTratto, matTratto); tratto.position.set(0, 0.005, -i * 10); tratto.receiveShadow = true;
        scena.add(tratto); lineeStrada.push(tratto);
    }

    // ==========================================
    // DESIGN MODELLO AUTO SPORTIVA 3D
    // ==========================================
    auto3D = new THREE.Group();
    const matRossoAcceso = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.15, metalness: 0.6 }); 
    const matBiancoDettagli = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.2 });
    const matNeroAbitacolo = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.3 });

    const scocca = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 1.3), matRossoAcceso); scocca.position.y = 0.18; scocca.castShadow = true; auto3D.add(scocca);
    const musetto = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 4), matRossoAcceso); musetto.rotation.x = Math.PI / 2; musetto.rotation.y = Math.PI / 4; musetto.position.set(0, 0.14, -0.9); musetto.castShadow = true; auto3D.add(musetto);
    const dettaglioMuso = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.5), matBiancoDettagli); dettaglioMuso.position.set(0, 0.23, -0.8); auto3D.add(dettaglioMuso);
    const abitacolo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.35), matNeroAbitacolo); abitacolo.position.set(0, 0.32, -0.05); auto3D.add(abitacolo);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 4, 8), matBiancoDettagli); halo.rotation.x = Math.PI / 2; halo.position.set(0, 0.36, -0.15); auto3D.add(halo);
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.25), matRossoAcceso); airbox.position.set(0, 0.44, 0.18); auto3D.add(airbox);
    const boccaAirbox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), matNeroAbitacolo); boccaAirbox.position.set(0, 0.45, 0.05); auto3D.add(boccaAirbox);
    
    const panciaSx = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.8), matRossoAcceso); panciaSx.position.set(-0.32, 0.16, 0.05); panciaSx.castShadow = true;
    const panciaDx = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.8), matRossoAcceso); panciaDx.position.set(0.32, 0.16, 0.05); panciaDx.castShadow = true;
    auto3D.add(panciaSx, panciaDx);

    const flapPanciaSx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.7), matBiancoDettagli); flapPanciaSx.position.set(-0.44, 0.16, 0.05);
    const flapPanciaDx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.7), matBiancoDettagli); flapPanciaDx.position.set(0.44, 0.16, 0.05);
    auto3D.add(flapPanciaSx, flapPanciaDx);

    const alaAntCentrale = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.22), matRossoAcceso); alaAntCentrale.position.set(0, 0.08, -1.15); alaAntCentrale.castShadow = true; auto3D.add(alaAntCentrale);
    const endplateAntSx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.26), matBiancoDettagli); endplateAntSx.position.set(-0.75, 0.12, -1.15);
    const endplateAntDx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.26), matBiancoDettagli); endplateAntDx.position.set(0.75, 0.12, -1.15);
    auto3D.add(endplateAntSx, endplateAntDx);

    const piloneSx = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.15), matRossoAcceso); piloneSx.position.set(-0.12, 0.32, 0.7);
    const piloneDx = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.15), matRossoAcceso); piloneDx.position.set(0.12, 0.32, 0.7);
    auto3D.add(piloneSx, piloneDx);

    const alaPostMain = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.3), matBiancoDettagli); alaPostMain.position.set(0, 0.5, 0.7); alaPostMain.castShadow = true; auto3D.add(alaPostMain);
    const endplatePostSx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.34), matRossoAcceso); endplatePostSx.position.set(-0.55, 0.42, 0.7);
    const endplatePostDx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.34), matRossoAcceso); endplatePostDx.position.set(0.55, 0.42, 0.7);
    auto3D.add(endplatePostSx, endplatePostDx);

    const geoGomma = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 24);
    const matGommaSlick = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85, metalness: 0.0 });
    const geoCerchione = new THREE.CylinderGeometry(0.13, 0.13, 0.33, 16);
    const matCerchioneAlu = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 });

    const posizioniRuote = [[-0.62, 0.24, -0.7], [0.62, 0.24, -0.7], [-0.66, 0.24, 0.45], [0.66, 0.24, 0.45]];
    posizioniRuote.forEach(pos => {
        let gruppoRuota = new THREE.Group();
        let copertone = new THREE.Mesh(geoGomma, matGommaSlick); copertone.rotation.z = Math.PI / 2; copertone.castShadow = true; gruppoRuota.add(copertone);
        let cerchione = new THREE.Mesh(geoCerchione, matCerchioneAlu); cerchione.rotation.z = Math.PI / 2; gruppoRuota.add(cerchione);
        gruppoRuota.position.set(pos[0], pos[1], pos[2]); auto3D.add(gruppoRuota);
    });

    const lucePosteriore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 }));
    lucePosteriore.position.set(0, 0.12, 0.76); auto3D.add(lucePosteriore);

    auto3D.position.set(0, 0, -1.5); 
    scena.add(auto3D);

    // Controlli di movimento
    window.addEventListener("touchstart", (e) => { 
        if (giocoAttivo) { 
            ultimoXIniziale = e.touches[0].clientX; 
            autoXIniziale = auto3D.position.x; 
        } 
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
        if (!giocoAttivo) return; 
        e.preventDefault(); 
        let spostamentoPixel = e.touches[0].clientX - ultimoXIniziale;
        auto3D.position.x = autoXIniziale + (spostamentoPixel / (window.innerWidth / (LARGHEZZA_STRADA * 1.5)));
        if (auto3D.position.x < -LIMITE_X) auto3D.position.x = -LIMITE_X; 
        if (auto3D.position.x > LIMITE_X) auto3D.position.x = LIMITE_X;
    }, { passive: false });

    let mousePremuto = false;
    window.addEventListener("mousedown", (e) => { 
        if (giocoAttivo) { 
            mousePremuto = true; 
            ultimoXIniziale = e.clientX; 
            autoXIniziale = auto3D.position.x; 
        } 
    });

    window.addEventListener("mousemove", (e) => {
        if (!giocoAttivo || !mousePremuto) return;
        let spostamentoPixel = e.clientX - ultimoXIniziale;
        auto3D.position.x = autoXIniziale + (spostamentoPixel / (window.innerWidth / (LARGHEZZA_STRADA * 1.5)));
        if (auto3D.position.x < -LIMITE_X) auto3D.position.x = -LIMITE_X; 
        if (auto3D.position.x > LIMITE_X) auto3D.position.x = LIMITE_X;
    });

    window.addEventListener("mouseup", () => { mousePremuto = false; });

    animate();
}

// ==========================================
// FABBRICA MODELLI OSTACOLI
// ==========================================
function creaModelloOstacoloCasuale() {
    const gruppoOstacolo = new THREE.Group();
    const tipi = ['CONO', 'TRANSENNA', 'BLOCCO'];
    const tipoScelto = tipi[Math.floor(Math.random() * tipi.length)];

    if (tipoScelto === 'CONO') {
        const matArancioCono = new THREE.MeshStandardMaterial({ color: 0xff3b00, roughness: 0.3, metalness: 0.1 });
        const matBiancoRiflettente = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const geoBase = new THREE.BoxGeometry(0.55, 0.05, 0.55);
        const base = new THREE.Mesh(geoBase, matArancioCono); base.position.y = 0.025; base.receiveShadow = true; gruppoOstacolo.add(base);

        const pezzoBasso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.25, 16), matArancioCono); pezzoBasso.position.y = 0.175; pezzoBasso.castShadow = true;
        const pezzoCentro = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 0.25, 16), matBiancoRiflettente); pezzoCentro.position.y = 0.425; pezzoCentro.castShadow = true;
        const pezzoAlto = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.11, 0.25, 16), matArancioCono); pezzoAlto.position.y = 0.675; pezzoAlto.castShadow = true;

        gruppoOstacolo.add(pezzoBasso, pezzoCentro, pezzoAlto); gruppoOstacolo.userData = { raggioCollisione: 0.35 };
    } else if (tipoScelto === 'TRANSENNA') {
        const matMetallo = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.2, metalness: 0.8 });
        const matRosso = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
        const matBianco = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
        const geoPalo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8);
        const p1 = new THREE.Mesh(geoPalo, matMetallo); p1.position.set(-0.55, 0.325, 0); p1.castShadow = true;
        const p2 = new THREE.Mesh(geoPalo, matMetallo); p2.position.set(0.55, 0.325, 0); p2.castShadow = true;
        gruppoOstacolo.add(p1, p2);

        const largoTratto = 1.3 / 5;
        for(let k=0; k<5; k++) {
            let mStriscia = (k % 2 === 0) ? matRosso : matBianco;
            let striscia = new THREE.Mesh(new THREE.BoxGeometry(largoTratto, 0.25, 0.06), mStriscia); striscia.position.set(-0.52 + (k * largoTratto), 0.55, 0); striscia.castShadow = true;
            gruppoOstacolo.add(striscia);
        }
        gruppoOstacolo.userData = { raggioCollisione: 0.7 };
    } else if (tipoScelto === 'BLOCCO') {
        const matCemento = new THREE.MeshStandardMaterial({ color: 0x8a8a85, roughness: 0.95, metalness: 0.0 });
        const blocco = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.5), matCemento); blocco.position.y = 0.325; blocco.castShadow = true; blocco.receiveShadow = true; gruppoOstacolo.add(blocco);
        const banda = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.52), new THREE.MeshStandardMaterial({ color: 0xb59500, roughness: 0.9 })); banda.position.y = 0.35; gruppoOstacolo.add(banda);
        gruppoOstacolo.userData = { raggioCollisione: 0.6 };
    }

    const xCasuale = (Math.random() * (LIMITE_X * 2)) - LIMITE_X;
    gruppoOstacolo.position.set(xCasuale, 0, -90); scena.add(gruppoOstacolo); ostacoli3D.push(gruppoOstacolo);
}

// ==========================================
// CALCOLO VELOCITÀ DINAMICA ATTENUATA
// ==========================================
function calcolaVelocitaDinamica(punti) {
    let stepAttuale = Math.floor(punti / 500); let resto = punti % 500;
    let baseVelocitaStep = VELOCITA_INIZIALE;
    for (let i = 0; i < stepAttuale; i++) baseVelocitaStep += 0.15 * Math.pow(0.75, i);
    let prossimoIncremento = 0.15 * Math.pow(0.75, stepAttuale);

    if (resto >= 400) {
        let fattoreFluido = (1 - Math.cos(((resto - 400) / 100) * Math.PI)) / 2;
        return baseVelocitaStep + (prossimoIncremento * 0.5 * fattoreFluido);
    } else if (resto < 100 && stepAttuale > 0) {
        let fattoreFluido = (1 - Math.cos(((resto / 100) + 1) * Math.PI)) / 2;
        return baseVelocitaStep - (prossimoIncremento * 0.5 * (1 - fattoreFluido));
    }
    return baseVelocitaStep;
}

// ==========================================
// LOOP DI GIOCO PRINCIPALE (60 FPS)
// ==========================================
let frameCounterPunti = 0; 

function animate() {
    requestAnimationFrame(animate);
    if (giocoAttivo) {
        frameCounterPunti++;
        if (frameCounterPunti >= 10) { 
            attualePunteggio += 1;
            const scoreDisp = document.getElementById("score-display");
            if (scoreDisp) scoreDisp.innerText = attualePunteggio;
            frameCounterPunti = 0; velocitaGioco = calcolaVelocitaDinamica(attualePunteggio);
            let quantiStepSuperati = Math.floor(attualePunteggio / 500);
            frequenzaSpawnAttuale = Math.max(20, 40 - Math.floor(quantiStepSuperati * 3));
        }

        if (matStrada && matStrada.map) matStrada.map.offset.y -= velocitaGioco * 0.015;
        lineeStrada.forEach(tratto => { tratto.position.z += velocitaGioco; if (tratto.position.z > 10) tratto.position.z = -180; });
        if (gruppoStelle) gruppoStelle.rotation.y += 0.0004;

        spawnTimer++;
        if (spawnTimer > frequenzaSpawnAttuale) { creaModelloOstacoloCasuale(); spawnTimer = 0; }

        for (let i = ostacoli3D.length - 1; i >= 0; i--) {
            let o = ostacoli3D[i]; o.position.z += velocitaGioco; 
            
            let distanzaZ = Math.abs(o.position.z - auto3D.position.z);
            let distanzaX = Math.abs(o.position.x - auto3D.position.x); 

            if (distanzaZ < 1.0 && distanzaX < (o.userData.raggioCollisione + 0.45)) {
                giocoAttivo = false; 
                salvaPunteggioOnline(attualeNickname, attualePunteggio);
                const liveUI = document.getElementById("live-score-ui");
                const finalSc = document.getElementById("final-score");
                if (liveUI) liveUI.style.display = "none";
                if (finalSc) finalSc.innerText = attualePunteggio;
                cambiaSchermata("screen-game", "screen-gameover");
                return;
            }

            if (o.position.z > 12) {
                scena.remove(o); ostacoli3D.splice(i, 1); attualePunteggio += 15;
                const scoreDisp = document.getElementById("score-display");
                if (scoreDisp) scoreDisp.innerText = attualePunteggio;
            }
        }
    }
    if (renderer && scena && telecamera) renderer.render(scena, telecamera);
}

window.addEventListener('resize', () => { if (telecamera && renderer) { telecamera.aspect = window.innerWidth / window.innerHeight; telecamera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); } });

// ==========================================
// INTERFACCIA UTENTE
// ==========================================
function iniziaAvventura() {
    const inputNome = document.getElementById("nickname-input").value.trim();
    if (inputNome === "") { alert("Inserisci un nickname!"); return; }

    localStorage.setItem("nicknameGioco", inputNome);
    attualeNickname = inputNome;
    
    ostacoli3D.forEach(o => scena.remove(o)); ostacoli3D = [];
    attualePunteggio = 0; velocitaGioco = VELOCITA_INIZIALE; frequenzaSpawnAttuale = 40;
    if (auto3D) auto3D.position.x = 0; 
    
    const scoreDisp = document.getElementById("score-display"); if (scoreDisp) scoreDisp.innerText = attualePunteggio;
    const liveUI = document.getElementById("live-score-ui"); if (liveUI) liveUI.style.display = "block";
    
    cambiaSchermata("screen-home", "screen-game");
    giocoAttivo = true; 
}