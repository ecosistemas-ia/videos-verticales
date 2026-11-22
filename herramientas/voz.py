"""La voz de los videos, escena por escena, con el tiempo de cada palabra para los subtítulos.

Gratis y en tu computadora: Kokoro-82M (pesos Apache-2.0), sin conexión una vez descargado el modelo.
De pago, opcional: ElevenLabs, con tu clave en .env (ELEVENLABS_API_KEY).

    uv run python -m herramientas.voz estado
    uv run python -m herramientas.voz instalar
    uv run python -m herramientas.voz muestra [--voz em_alex] [--acento es|es-419] [--texto "..."]
    uv run python -m herramientas.voz videos/<carpeta> [--voz em_alex] [--acento es-419] [--velocidad 1.0]
    uv run python -m herramientas.voz videos/<carpeta> --motor elevenlabs --voz <id> [--estimar] [--confirmado]
    uv run python -m herramientas.voz voces-elevenlabs

Escribe videos/<carpeta>/voz/escena-NN.wav (o .mp3) y voz/voz.json, que lee scripts/preparar.ts.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
MODELOS = APP / "modelos" / "voz"
RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1"
# Hashes publicados por GitHub para esa versión (comprobados el 20/11/2026).
ARCHIVOS = {
    "kokoro-v1.0.onnx": ("beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a", 325_505_369),
    "voices-v1.0.bin": ("bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d", 28_214_398),
}
VOCES = {
    "ef_dora": "mujer",
    "em_alex": "hombre",
    "em_santa": "hombre, más grave",
}
ACENTOS = {"es": "España (con z)", "es-419": "América (seseo)"}
# La voz y el acento por defecto: hombre, acento de América (seseo).
VOZ_POR_DEFECTO = "em_alex"
TEXTO_MUESTRA = (
    "¿Sabías que el 70 % de las búsquedas en YouTube ya pasa por la IA? "
    "En 2026, ChatGPT y Google responden antes de que hagas clic. Te lo explico en 40 segundos."
)
SIGNOS = "¿?¡!.,;:«»\"'()…—-"


def salir(mensaje: str) -> None:
    print(mensaje, file=sys.stderr)
    sys.exit(1)


# ── Instalación ────────────────────────────────────────────────────────────────────────────────


def sha256(ruta: Path) -> str:
    h = hashlib.sha256()
    with ruta.open("rb") as f:
        for bloque in iter(lambda: f.read(1 << 20), b""):
            h.update(bloque)
    return h.hexdigest()


def modelo_listo() -> bool:
    return all((MODELOS / n).is_file() and (MODELOS / n).stat().st_size == t for n, (_, t) in ARCHIVOS.items())


def instalar() -> None:
    MODELOS.mkdir(parents=True, exist_ok=True)
    for nombre, (huella, tamano) in ARCHIVOS.items():
        destino = MODELOS / nombre
        if destino.is_file() and destino.stat().st_size == tamano and sha256(destino) == huella:
            print(f"✓ {nombre} ya está")
            continue
        temporal = destino.with_suffix(destino.suffix + ".parcial")
        print(f"Descargando {nombre} ({tamano / 1e6:.0f} MB)...", flush=True)
        try:
            with urllib.request.urlopen(f"{RELEASE}/{nombre}", timeout=60) as r, temporal.open("wb") as f:
                hecho, ultimo = 0, -1
                for bloque in iter(lambda: r.read(1 << 20), b""):
                    f.write(bloque)
                    hecho += len(bloque)
                    p = hecho * 10 // tamano
                    if p != ultimo:
                        ultimo = p
                        print(f"  {p * 10}%", end="", flush=True)
            print()
        except (urllib.error.URLError, TimeoutError) as e:
            temporal.unlink(missing_ok=True)
            salir(f"No se pudo descargar {nombre}: {e}. Comprueba la conexión y vuelve a ejecutar la orden.")
        if sha256(temporal) != huella:
            temporal.unlink(missing_ok=True)
            salir(f"{nombre} llegó dañado (no coincide su huella). Vuelve a ejecutar la orden.")
        temporal.replace(destino)
        print(f"✓ {nombre}")
    kokoro()  # comprueba que carga
    print("Voz gratis lista. Prueba: uv run python -m herramientas.voz muestra")


def estado() -> None:
    if not modelo_listo():
        salir("Falta el modelo de voz: uv run python -m herramientas.voz instalar")
    kokoro()
    print(f"Kokoro, voces {', '.join(VOCES)}")


_KOKORO = None


def kokoro():
    global _KOKORO
    if _KOKORO is None:
        if not modelo_listo():
            salir("Falta el modelo de voz: uv run python -m herramientas.voz instalar")
        from kokoro_onnx import Kokoro

        _KOKORO = Kokoro(str(MODELOS / "kokoro-v1.0.onnx"), str(MODELOS / "voices-v1.0.bin"))
    return _KOKORO


# ── Pronunciación y tiempos por palabra ───────────────────────────────────────────────────────


def nucleo(palabra: str) -> str:
    return palabra.strip(SIGNOS)


def diccionario(carpeta: Path | None) -> dict[str, str]:
    d: dict[str, str] = {}
    for ruta in [APP / "recursos" / "pronunciar.json"] + ([carpeta / "voz" / "pronunciar.json"] if carpeta else []):
        if ruta.is_file():
            d.update({k: v for k, v in json.loads(ruta.read_text(encoding="utf-8")).items() if not k.startswith("_")})
    return d


def dicha(palabra: str, dic: dict[str, str]) -> str:
    n = nucleo(palabra)
    return palabra.replace(n, dic[n]) if n and n in dic else palabra


def es_signo(c: str) -> bool:
    return unicodedata.category(c).startswith("P") or c in "¿¡—…^$_"


def grupos_de_fonemas(tiempos) -> list[list[float]]:
    """Agrupa los fonemas con tiempo en palabras fonéticas (separadas por espacio o signo)."""
    grupos: list[list[float]] = []
    actual = None
    for t in tiempos:
        ph = t.phoneme
        if ph.isspace() or all(es_signo(c) for c in ph):
            if actual:
                grupos.append(actual)
                actual = None
            continue
        if actual is None:
            actual = [t.start, t.end]
        else:
            actual[1] = t.end
    if actual:
        grupos.append(actual)
    return grupos


def cuantos_grupos(fonemizar, palabra: str) -> int:
    ph = "".join(" " if (c.isspace() or es_signo(c)) else c for c in fonemizar(palabra))
    return len(ph.split())


def silencios(audio, sr: int, minimo_ms: int = 80, umbral_db: float = -40.0) -> list[tuple[float, float]]:
    import numpy as np

    paso = int(0.01 * sr)
    if len(audio) < paso * 2:
        return []
    n = len(audio) // paso
    tramos = audio[: n * paso].reshape(n, paso)
    db = 20 * np.log10(np.sqrt((tramos**2).mean(axis=1)) + 1e-9)
    mudo = db < db.max() + umbral_db
    regiones, i = [], 0
    while i < n:
        if mudo[i]:
            j = i
            while j < n and mudo[j]:
                j += 1
            if (j - i) * 10 >= minimo_ms:
                regiones.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return regiones


def recortar(palabras: list[dict], regiones) -> list[dict]:
    """Ajusta cada palabra a los silencios medidos: el motor alarga la última palabra antes de una pausa."""
    salida = []
    for w in palabras:
        ini, fin = w["inicio"], w["fin"]
        for s0, s1 in regiones:
            if ini < s0 < fin:
                fin = s0
            if ini < s1 < fin and s0 <= ini:
                ini = s1
        salida.append({"texto": w["texto"], "inicio": round(ini, 3), "fin": round(max(fin, ini + 0.04), 3)})
    return salida


def repartir(textos: list[str], inicio: float, fin: float) -> list[dict]:
    """Plan B si los fonemas no cuadran: reparte el tiempo hablado según la longitud de cada palabra."""
    pesos = [max(1, len(nucleo(t))) for t in textos]
    total, t, salida = sum(pesos), inicio, []
    for texto, p in zip(textos, pesos):
        d = (fin - inicio) * p / total
        salida.append({"texto": texto, "inicio": round(t, 3), "fin": round(t + d * 0.92, 3)})
        t += d
    return salida


def sintetizar_kokoro(texto: str, voz: str, acento: str, velocidad: float, dic: dict[str, str]):
    """Devuelve (audio, sr, palabras, cuadra)."""
    k = kokoro()
    mostradas = texto.split()
    hablado = " ".join(dicha(w, dic) for w in mostradas)
    audio, sr, tiempos = k.create_timed(hablado, voice=voz, lang=acento, speed=velocidad)
    fonemizar = lambda s: k.tokenizer.phonemize(s, acento)  # noqa: E731
    cuentas = [cuantos_grupos(fonemizar, dicha(w, dic)) for w in mostradas]
    grupos = grupos_de_fonemas(tiempos)
    regiones = silencios(audio, sr)
    if tiempos and sum(cuentas) == len(grupos):
        palabras, i = [], 0
        for w, c in zip(mostradas, cuentas):
            if c == 0:  # un signo suelto como «%» se lee con la palabra anterior y se muestra con ella
                if palabras:
                    palabras[-1]["texto"] += " " + w
                continue
            g = grupos[i : i + c]
            i += c
            palabras.append({"texto": w, "inicio": g[0][0], "fin": g[-1][1]})
        return audio, sr, recortar(palabras, regiones), True
    hablado_ini = regiones[0][1] if regiones and regiones[0][0] <= 0.01 else 0.0
    hablado_fin = regiones[-1][0] if regiones and regiones[-1][1] >= len(audio) / sr - 0.02 else len(audio) / sr
    return audio, sr, repartir(mostradas, hablado_ini, hablado_fin), False


# ── ElevenLabs (opcional, de pago) ────────────────────────────────────────────────────────────


def clave_elevenlabs() -> str:
    clave = os.environ.get("ELEVENLABS_API_KEY", "")
    env = APP / ".env"
    if not clave and env.is_file():
        for linea in env.read_text(encoding="utf-8").splitlines():
            if linea.strip().startswith("ELEVENLABS_API_KEY="):
                clave = linea.split("=", 1)[1].strip().strip('"').strip("'")
    if not clave:
        salir("Falta ELEVENLABS_API_KEY en .env (copia .env.example como .env y pon tu clave; nunca la pegues en el chat).")
    return clave


def pedir(url: str, clave: str, cuerpo: dict | None = None) -> dict:
    datos = None if cuerpo is None else json.dumps(cuerpo).encode("utf-8")
    req = urllib.request.Request(url, data=datos, headers={"xi-api-key": clave, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "replace")[:300]
        salir(f"ElevenLabs respondió {e.code}: {detalle}")
    return {}


def creditos_restantes(clave: str) -> int | None:
    s = pedir("https://api.elevenlabs.io/v1/user/subscription", clave)
    try:
        return int(s["character_limit"]) - int(s["character_count"])
    except (KeyError, TypeError, ValueError):
        return None


def voces_elevenlabs() -> None:
    clave = clave_elevenlabs()
    for v in pedir("https://api.elevenlabs.io/v1/voices", clave).get("voices", []):
        etiquetas = ", ".join(f"{k}: {x}" for k, x in (v.get("labels") or {}).items())
        print(f"{v.get('voice_id')}  {v.get('name')}  ({etiquetas})")


def sintetizar_elevenlabs(texto: str, voz: str, modelo: str, clave: str):
    """Devuelve (mp3, palabras). Los tiempos vienen por carácter: se agrupan por palabras."""
    r = pedir(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voz}/with-timestamps?output_format=mp3_44100_128",
        clave,
        {"text": texto, "model_id": modelo},
    )
    al = r.get("alignment") or {}
    letras = al.get("characters", [])
    ini, fin = al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", [])
    palabras, actual = [], None
    for c, a, b in zip(letras, ini, fin):
        if c.isspace():
            if actual:
                palabras.append(actual)
                actual = None
            continue
        if actual is None:
            actual = {"texto": c, "inicio": a, "fin": b}
        else:
            actual["texto"] += c
            actual["fin"] = b
    if actual:
        palabras.append(actual)
    return base64.b64decode(r["audio_base64"]), [{**p, "inicio": round(p["inicio"], 3), "fin": round(p["fin"], 3)} for p in palabras]


# ── Un video ──────────────────────────────────────────────────────────────────────────────────


def textos_del_guion(carpeta: Path) -> list[str | None]:
    node = shutil.which("node")
    if node is None:
        salir("No encuentro Node: instálalo y vuelve a abrir la terminal.")
    r = subprocess.run([node, str(APP / "scripts" / "textos.ts"), str(carpeta)], cwd=APP, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        salir(r.stderr.strip() or "No pude leer el guion.")
    return json.loads(r.stdout)


def duracion_mp3(datos: bytes) -> float | None:
    try:
        import io

        import soundfile as sf

        info = sf.info(io.BytesIO(datos))
        return info.frames / info.samplerate
    except Exception:  # noqa: BLE001
        return None


def voz_de_video(a: argparse.Namespace) -> None:
    carpeta = Path(a.objetivo).resolve()
    if not (carpeta / "guion.json").is_file():
        salir(f"No hay guion.json en {carpeta}")
    textos = textos_del_guion(carpeta)
    con_voz = [t for t in textos if t]
    caracteres = sum(len(t) for t in con_voz)
    salida = carpeta / "voz"
    salida.mkdir(exist_ok=True)

    if a.motor == "elevenlabs":
        if not a.voz or a.voz in VOCES:
            salir("Con ElevenLabs, --voz es el id de la voz: míralos con  uv run python -m herramientas.voz voces-elevenlabs")
        clave = clave_elevenlabs()
        por_caracter = 0.5 if "flash" in a.modelo or "turbo" in a.modelo else 1.0
        creditos = round(caracteres * por_caracter)
        restantes = creditos_restantes(clave)
        print(f"{len(con_voz)} escenas con voz, {caracteres} caracteres: unos {creditos} créditos de ElevenLabs ({a.modelo}).")
        if restantes is not None:
            print(f"Te quedan {restantes} créditos este mes.")
        print("Ojo: con el plan gratis de ElevenLabs el audio no se puede usar con fines comerciales y hay que citar a ElevenLabs.")
        if a.estimar or not a.confirmado:
            if not a.estimar:
                print("Para generar la voz, repite la orden con --confirmado.")
            return
        escenas = []
        for i, texto in enumerate(textos, start=1):
            if not texto:
                escenas.append(None)
                continue
            mp3, palabras = sintetizar_elevenlabs(texto, a.voz, a.modelo, clave)
            archivo = salida / f"escena-{i:02d}.mp3"
            archivo.write_bytes(mp3)
            dur = duracion_mp3(mp3) or (palabras[-1]["fin"] + 0.15 if palabras else 1.0)
            escenas.append({"archivo": f"voz/{archivo.name}", "duracion": round(dur, 3), "palabras": palabras})
            print(f"✓ escena {i}: {dur:.1f} s", flush=True)
        guardar(salida, {"motor": "elevenlabs", "voz": a.voz, "modelo": a.modelo, "creditos": creditos, "coste_usd": None, "escenas": escenas})
        return

    import soundfile as sf

    voz = a.voz or VOZ_POR_DEFECTO
    if voz not in VOCES:
        salir(f"Voz desconocida: {voz}. Voces gratis: {', '.join(VOCES)}")
    dic = diccionario(carpeta)
    escenas, descuadres = [], []
    for i, texto in enumerate(textos, start=1):
        if not texto:
            escenas.append(None)
            continue
        audio, sr, palabras, cuadra = sintetizar_kokoro(texto, voz, a.acento, a.velocidad, dic)
        archivo = salida / f"escena-{i:02d}.wav"
        sf.write(str(archivo), audio, sr, subtype="PCM_16")
        dur = len(audio) / sr
        escenas.append({"archivo": f"voz/{archivo.name}", "duracion": round(dur, 3), "palabras": palabras})
        if not cuadra:
            descuadres.append(i)
        print(f"✓ escena {i}: {dur:.1f} s", flush=True)
    guardar(salida, {"motor": "kokoro", "voz": voz, "acento": a.acento, "velocidad": a.velocidad, "coste_usd": 0, "escenas": escenas})
    if descuadres:
        print(f"Aviso: en las escenas {descuadres} los tiempos por palabra son aproximados (subtítulos algo menos precisos).")


def guardar(salida: Path, datos: dict) -> None:
    (salida / "voz.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(e["duracion"] for e in datos["escenas"] if e)
    print(f"✓ voz/voz.json: {sum(1 for e in datos['escenas'] if e)} escenas, {total:.1f} s de voz")


def muestra(a: argparse.Namespace) -> None:
    import soundfile as sf

    voz = a.voz or VOZ_POR_DEFECTO
    texto = a.texto or TEXTO_MUESTRA
    audio, sr, palabras, cuadra = sintetizar_kokoro(texto, voz, a.acento, a.velocidad, diccionario(None))
    destino = APP / "modelos" / f"muestra_{voz}_{a.acento}.wav"
    sf.write(str(destino), audio, sr, subtype="PCM_16")
    print(f"✓ {destino} ({len(audio) / sr:.1f} s, voz {voz}, {ACENTOS.get(a.acento, a.acento)})")
    if not a.sin_abrir:
        abrir(destino)


def abrir(ruta: Path) -> None:
    try:
        if sys.platform == "win32":
            os.startfile(str(ruta))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", str(ruta)], check=False)
        else:
            subprocess.run(["xdg-open", str(ruta)], check=False)
    except OSError:
        print(f"Ábrelo a mano: {ruta}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Windows: que los acentos y ✓ no rompan la consola
        sys.stderr.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(prog="herramientas.voz", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("objetivo", help="estado · instalar · muestra · voces-elevenlabs · videos/<carpeta>")
    p.add_argument("--motor", choices=["kokoro", "elevenlabs"], default="kokoro")
    p.add_argument("--voz", default=None, help=f"gratis: {', '.join(f'{k} ({v})' for k, v in VOCES.items())}, por defecto {VOZ_POR_DEFECTO}; ElevenLabs: el id")
    p.add_argument("--acento", choices=list(ACENTOS), default="es-419", help="es-419 = América (por defecto), es = España (solo voz gratis)")
    p.add_argument("--velocidad", type=float, default=1.0, help="de 0.8 a 1.3 (solo voz gratis)")
    p.add_argument("--modelo", default="eleven_multilingual_v2", help="modelo de ElevenLabs")
    p.add_argument("--texto", default=None, help="texto de la muestra")
    p.add_argument("--estimar", action="store_true", help="ElevenLabs: solo dice cuántos créditos gastaría")
    p.add_argument("--confirmado", action="store_true", help="ElevenLabs: genera la voz (gasta créditos)")
    p.add_argument("--sin-abrir", action="store_true")
    a = p.parse_args()
    if not 0.5 <= a.velocidad <= 2.0:
        salir("La velocidad va de 0.5 a 2.0 (lo natural, de 0.9 a 1.2).")
    acciones = {"estado": lambda: estado(), "instalar": lambda: instalar(), "muestra": lambda: muestra(a), "voces-elevenlabs": lambda: voces_elevenlabs()}
    acciones.get(a.objetivo, lambda: voz_de_video(a))()


if __name__ == "__main__":
    main()
