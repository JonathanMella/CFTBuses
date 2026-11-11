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

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Ejecutar Servidor Web Local (Recomendado)
Haz doble clic en el archivo:
```bash
iniciar_buscftla.bat
```
O desde PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
Luego abre tu navegador en:
```
http://127.0.0.1:8080/
```

### Opción 2: Abrir en Android Studio
1. Abre esta carpeta `c:\Users\titan\AndroidStudioProjects\CFTbuses` en Android Studio.
2. Presiona **Run 'app'** para ejecutarla en un emulador Android o dispositivo físico conectado.
