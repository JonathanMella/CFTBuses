# BusCFTLA — Sistema de Seguimiento de Transporte CFT Lota Arauco

**BusCFTLA** es una Aplicación Web Progresiva (PWA) móvil responsiva desarrollada para la comunidad del **Centro de Formación Técnica Lota Arauco (CFTLA)** en **Lota, Chile**.

---

## 🌟 Características Principales

### 1. Interfaz y Experiencia de Usuario (UI/UX)
- **Paleta Institucional Oficial:** Azul principal (`#1E40AF` / `#1D4ED8`), blanco, gris claro para tarjetas (`#F1F5F9`) y acentos en amarillo (`#F59E0B`), verde (`#10B981`) y rojo (`#EF4444`).
- **Modos Visuales Dinámicos:**
  - **Perfil Estudiante:** Azul institucional con estética tech universitaria.
  - **Perfil Docente:** Modo marrón cálido / ámbar refinado (`#78350F` / `#92400E`).
  - Opciones adicionales de **Modo Oscuro** y **Modo Claro**.
- **Encabezado Inteligente:**
  - Nombre de la app con distintivo oficial.
  - Indicador geográfico `Lota, Chile` con pulso en tiempo real.
  - Selector rápido de paraderos y avatar interactivo con rol.
- **Mapa Interactivo Pantalla Completa:**
  - Desarrollado con **Leaflet** y azulejos geográficos de **OpenStreetMap** centrados en Lota, Región del Biobío (`-37.0945, -73.1585`).
  - Marcadores interactivos para paraderos autorizados (azul), sede central CFTLA (verde con insignia y pulso animado) y paradero seleccionado (amarillo/naranja).
  - Trazado de recorridos de **Línea A**, **Línea B**, **Línea C** y **Línea D**.
  - Simulación de autobuses circulando en vivo por las calles de Lota.
  - Leyenda flotante en la esquina inferior izquierda con filtros de líneas activables.

### 2. Panel Desplegable de Paraderos (Bottom Sheet)
Al presionar cualquier marcador o seleccionarlo desde el buscador:
- Nombre y descripción geográfica del paradero.
- **Frecuencia:** Rango de minutos entre buses (ej: `15–25 min` o `5–12 min`).
- **Tiempo estimado al CFTLA:** Minutos de viaje o `¡Estás aquí!`.
- **Líneas que pasan:** Etiquetas de colores con rutas asociadas.
- **Próximo bus estimado con contador en tiempo real:** Cuenta regresiva activa segundo a segundo con patente del bus (`BCDF-12`, `CFTR-44`, etc.) y estado de aproximación.
- Acciones rápidas: Enfocar paradero y reportar micro directo al centro de denuncias.

### 3. Roles de Usuario y Autenticación
- **Modal de Selección de Rol:**
  - **Estudiante:** Código de estudiante `2024-8507`, institución `CFTLA — Lota Arauco`, carrera `Técnico en Administración` y métricas: **Rutas (4)**, **Viajes (27)**, **Alertas (1)**.
  - **Profesor/a (Docente):** Código docente `DOC-229`, módulo `Departamento Académico` y panel adaptado.
  - Opción de cambio de perfil y "Cerrar sesión".

### 4. Panel Lateral / Modal de Perfil (4 Pestañas)
Al tocar el avatar superior:
1. **Perfil:** Credencial digital oficial CFTLA, código, carrera, métricas académicas y botones de cambio de rol o cierre de sesión.
2. **Ajustes:** Conmutadores de notificaciones de proximidad a 5 minutos, frecuencia de actualización (10s, 15s, 30s, 60s), audio de interacción y personalización de temas.
3. **Ayuda ("¿Cómo usar BusCFTLA?"):**
   - *Ver el mapa:* Guía visual de Lota.
   - *Seleccionar un paradero:* Frecuencia y tiempos.
   - *Frecuencia de buses:* Rangos de paso.
   - *Tiempo al CFTLA:* Estimación de llegada al campus.
   - *Tu perfil:* Gestión de cuenta.
   - *Centro de denuncias:* Fiscalización ciudadana.
4. **Denuncia (Centro de Denuncias):**
   - Formulario de fiscalización:
     - Matrícula del vehículo con formateo chileno (`BCDF-12`).
     - Chips de patentes vistas recientemente.
     - Línea y categoría de infracción (ej: no se detuvo, exceso de velocidad, pase escolar).
     - Motivo de la denuncia con contador dinámico `0/500` caracteres.
   - Banner de advertencia reglamentario: *"Las denuncias falsas pueden tener consecuencias disciplinarias. Por favor, solo reporta situaciones reales."*
   - Folio de seguimiento generado (ej. `DEN-2026-8941`) e historial persistente en `localStorage`.

### 5. Soporte PWA y Android Nativo
- **PWA:** `manifest.json`, Service Worker (`sw.js`) con soporte offline, instalación en pantalla de inicio de Android e iOS.
- **Android Studio (`CFTbuses`):** Se integró `MainActivity.kt` con WebView optimizado y los archivos web sincronizados en `app/src/main/assets/www/` para compilar directamente como APK nativo.

---

## Backend: alcance y estado

El proyecto incluye una PWA (HTML/CSS/JavaScript, Leaflet y datos locales), un contenedor Android basado en WebView y un servidor PowerShell que entrega la aplicación y la API. Los usuarios se crean mediante registro y verificación de correo; no se precargan cuentas de demostración. El mapa, las rutas, los paraderos y la posición de los buses siguen siendo simulados en `js/data.js`; aún no hay GPS real ni integración con sistemas del CFTLA.

La API está implementada en `backend.py` con la biblioteca estándar de Python. Endpoints: `GET /api/health`, `POST /api/register`, `POST /api/verify-email`, `POST /api/resend-verification`, `POST /api/login`, `GET /api/me`, `POST /api/logout`, `GET /api/complaints` y `POST /api/complaints`. Los endpoints privados usan `Authorization: Bearer <token>`. Las contraseñas y los códigos de verificación se guardan como hashes. La base se crea en `data/buscftla.sqlite3`.

Desde el botón **Regístrate**, el servidor acepta solo correos `@cftla.cl`: sin punto en el nombre antes de `@` se asigna el perfil estudiante (por ejemplo `berodriguez@cftla.cl`); con un punto se asigna profesor/a (por ejemplo `patricia.albornoz@cftla.cl`). Más de un punto antes de `@` no se permite. El registro solicita nombre completo y contraseña de al menos 8 caracteres. Envía un código de seis dígitos al correo indicado; al comprobarlo se activa la cuenta y se inicia la sesión. El código vence en 10 minutos.

### Envío gratuito con Gmail

El iniciador `server.ps1` solicita el correo Gmail remitente y una contraseña de aplicación (entrada oculta) al arrancar. Usa por defecto Gmail SMTP con SSL directo en el puerto 465; también admite STARTTLS en el puerto 587 con `BUSCFTLA_SMTP_SSL=0`. La contraseña no se escribe en los archivos del proyecto. Google explica cómo crear contraseñas de aplicación en [esta ayuda](https://support.google.com/mail/answer/185833?hl=es) y documenta el envío SMTP con TLS/SSL en los puertos 465 y 587 ([configuración de Gmail](https://support.google.com/mail/answer/7104828?hl=es)).

Este envío queda limitado por las cuotas de Gmail. El correo remitente puede ser una cuenta Gmail gratuita; los correos de verificación se envían a las direcciones `@cftla.cl` ingresadas por el usuario.

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Ejecutar Servidor Web Local (Recomendado)
Haz doble clic en el archivo:
```bash
iniciar_buscftla.bat
```
O desde PowerShell (requiere Python 3). Este iniciador configura Gmail de forma temporal para el proceso y te pedirá la contraseña de aplicación sin mostrarla:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
El servidor entrega la interfaz y la API. Abre el navegador en:
```
http://127.0.0.1:8080/
```

El puerto se puede cambiar con `-Port 8081`; `BUSCFTLA_DB` permite definir otra ubicación para el archivo SQLite.

Si el mapa queda con cuadrados grises, recarga la página para pedir los mosaicos otra vez. La capa estándar solicita los mosaicos desde `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; ante varios errores consecutivos, la interfaz cambia a CARTO Voyager.

### Prueba manual rápida

1. Ejecuta `powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080` en esta carpeta. Ingresa tu cuenta Gmail remitente y su contraseña de aplicación en la entrada oculta, y abre `http://127.0.0.1:8080/`.
2. Comprueba `http://127.0.0.1:8080/api/health`; debe responder `{"ok": true, ...}`.
3. En **Regístrate**, usa un correo `@cftla.cl` accesible y revisa que llegue el código de 6 dígitos. Pruébalo, recarga la página antes de verificar y confirma que aún puedes completar el paso.
4. Comprueba que un inicio de sesión antes de introducir el código sea rechazado. Tras verificarlo, la cuenta debe quedar iniciada.
5. Envía una denuncia con patente `BCDF-12`, una línea y un motivo de al menos 10 caracteres. Debe aparecer un folio `DEN-AAAA-NNNN`; recarga y confirma que el historial persiste.

Las pruebas automatizadas de la API se ejecutan con `python -m unittest discover -s tests -v` (no necesitan iniciar el servidor ni enviar correos reales; la entrega de email se simula en la prueba).

Prueba de API desde PowerShell, con el servidor activo:

```powershell
$email = Read-Host 'Correo @cftla.cl ya verificado'
$password = Read-Host 'Contraseña de BusCFTLA' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$login = Invoke-RestMethod http://127.0.0.1:8080/api/login -Method Post -ContentType 'application/json' -Body (@{email=$email;password=$plain} | ConvertTo-Json)
$plain = $null
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod http://127.0.0.1:8080/api/complaints -Method Post -Headers $headers -ContentType 'application/json' -Body '{"plate":"BCDF-12","line":"Línea A","category":"No se detuvo en paradero","reason":"El bus no se detuvo en el paradero indicado."}'
Invoke-RestMethod http://127.0.0.1:8080/api/complaints -Headers $headers
```

### Android

El backend se ejecuta en el servidor, no dentro del APK. En Android, las preferencias, el token de sesión y el historial local se cifran con AES-GCM usando una clave del Android Keystore; la clave no se guarda dentro del APK. Las copias automáticas de datos están desactivadas y el WebView no se inspecciona en la compilación release.

La compilación debug permite HTTP para desarrollo local. Para probar en un teléfono físico, `js/app.js` apunta temporalmente a `http://10.162.227.223:8080/api`; el teléfono y el computador deben estar en la misma Wi-Fi y esa IP puede cambiar. La compilación release bloquea tráfico HTTP sin cifrar; para publicarla debe apuntar al dominio HTTPS del servidor. La PWA abierta en un navegador común sigue usando el almacenamiento propio del navegador.

### Crear e instalar un APK de prueba en un teléfono Android

1. En Android Studio, abre esta carpeta del proyecto y espera a que termine la sincronización de Gradle.
2. Selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Para probar, se genera el APK debug, firmado automáticamente para instalación de prueba.
3. Busca `app/build/outputs/apk/debug/app-debug.apk` y cópialo al teléfono por USB.
4. En el teléfono, abre el APK desde Archivos y autoriza la instalación para esa aplicación si Android lo solicita.
5. Antes de usar registro o inicio de sesión, inicia `server.ps1` en el computador y comprueba desde el navegador del teléfono `http://10.162.227.223:8080/api/health`. El computador debe permitir el acceso privado por el puerto 8080.

Este APK debug es para pruebas en la misma red. Para Google Play se debe generar una compilación release firmada y configurar la dirección HTTPS definitiva del servidor.

### Opción 2: Abrir en Android Studio
1. Abre esta carpeta `c:\Users\titan\AndroidStudioProjects\CFTbuses` en Android Studio.
2. Presiona **Run 'app'** para ejecutarla en un emulador Android o dispositivo físico conectado.
