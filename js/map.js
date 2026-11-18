/**
 * BusCFTLA - Motor del Mapa Interactivo (Leaflet + OpenStreetMap)
 * Lota, Chile - Centro de Formación Técnica Lota Arauco
 */

class BusCFTLAMap {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.busMarkers = new Map();
    this.routeLayers = new Map();
    this.selectedStopId = null;
    this.tileLayer = null;
    this.currentTileStyle = 'light';
    this.tileErrorCount = 0;
    this.tileFallbackUsed = false;
    this.userLocationMarker = null;
    this.animationTimer = null;
  }

  /**
   * Inicializar el mapa de Leaflet centrado en Lota
   */
  init(containerId = 'map-container') {
    if (typeof L === 'undefined') {
      console.error('Leaflet (L) no está disponible en este momento.');
      if (window.busApp) window.busApp.showMapError('No se cargó el componente del mapa. Revisa tu conexión e inténtalo otra vez.');
      return;
    }

    if (typeof BUSCFTLA_DATA === 'undefined') {
      console.error('BUSCFTLA_DATA no está disponible.');
      if (window.busApp) window.busApp.showMapError('Faltan los datos de rutas y paraderos. Recarga la aplicación para volver a cargarlos.');
      return;
    }

    const center = BUSCFTLA_DATA.institution.centerCoords;
    const zoom = BUSCFTLA_DATA.institution.zoom;

    // Crear instancia de mapa
    this.map = L.map(containerId, {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false
    });

    // Añadir control de zoom en esquina superior derecha (debajo del header)
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Añadir atribución limpia en la esquina inferior derecha
    L.control.attribution({
      position: 'bottomright',
      prefix: '<span>© OpenStreetMap · BusCFTLA</span>'
    }).addTo(this.map);

    // Cargar capa base de azulejos (Tiles)
    this.setTileLayer('standard');

    // Dibujar rutas de las líneas
    this.renderRoutes();

    // Dibujar marcadores de paraderos y CFTLA
    this.renderStops();

    // Dibujar buses activos en tiempo real
    this.renderActiveBuses();

    // Iniciar simulación suave de buses en movimiento
    this.startLiveBusSimulation();

    // Redimensionar correctamente cuando cambie el viewport
    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });
    requestAnimationFrame(() => this.map.invalidateSize({ pan: false }));

    console.log('Mapa BusCFTLA inicializado con éxito en Lota, Chile.');
  }

  /**
   * Cambiar proveedor de azulejos según tema
   */
  setTileLayer(style = 'standard') {
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    let url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;
    let subdomains = null;
    let attribution = '© OpenStreetMap contributors';

    if (style === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      subdomains = 'abcd';
      attribution = '© OpenStreetMap contributors, © CARTO';
    } else if (style === 'voyager') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      subdomains = 'abcd';
      attribution = '© OpenStreetMap contributors, © CARTO';
    }

    if (style !== 'voyager') this.tileFallbackUsed = false;
    this.tileErrorCount = 0;

    const tileOptions = {
      maxZoom: maxZoom,
      attribution
    };
    if (subdomains) tileOptions.subdomains = subdomains;
    this.tileLayer = L.tileLayer(url, tileOptions).addTo(this.map);

    this.tileLayer.on('load', () => {
      if (window.busApp) window.busApp.clearMapWarning();
    });

    this.tileLayer.on('tileerror', (event) => {
      console.warn('Error al cargar mosaico del mapa:', event.coords, event.tile && event.tile.src);
      if (style === 'standard' && !this.tileFallbackUsed && ++this.tileErrorCount >= 4) {
        this.tileFallbackUsed = true;
        console.warn('OpenStreetMap no respondió a varios mosaicos; cambiando a CARTO Voyager.');
        this.setTileLayer('voyager');
      } else if (style !== 'standard' && ++this.tileErrorCount >= 4 && window.busApp) {
        window.busApp.showMapWarning('No se pudieron cargar las calles del mapa. Revisa tu conexión.');
      }
    });

    this.currentTileStyle = style;
  }

  /**
   * Renderizar los trazados de las 4 líneas
   */
  renderRoutes() {
    BUSCFTLA_DATA.lines.forEach((line) => {
      const polyline = L.polyline(line.route, {
        color: line.color,
        weight: 5,
        opacity: 0.75,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Tooltip informativo al pasar el cursor
      polyline.bindTooltip(`<strong>${line.name}</strong><br>${line.frequency}`, {
        sticky: true,
        className: 'route-tooltip'
      });

      polyline.addTo(this.map);
      this.routeLayers.set(line.id, polyline);
    });
  }

  /**
   * Alternar visibilidad de una línea
   */
  toggleLineVisibility(lineId, isVisible) {
    const layer = this.routeLayers.get(lineId);
    if (!layer) return;

    if (isVisible) {
      if (!this.map.hasLayer(layer)) layer.addTo(this.map);
    } else {
      if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
    }
  }

  /**
   * Renderizar marcadores de todos los paraderos y sede CFTLA
   */
  renderStops() {
    BUSCFTLA_DATA.stops.forEach((stop) => {
      const isSelected = this.selectedStopId === stop.id;
      const markerIcon = this.createStopIcon(stop, isSelected);

      const marker = L.marker(stop.coords, {
        icon: markerIcon,
        riseOnHover: true,
        title: stop.name
      }).addTo(this.map);

      // Evento de clic en paradero
      marker.on('click', () => {
        this.selectStop(stop.id);
      });

      this.markers.set(stop.id, marker);
    });
  }

  /**
   * Generar icono HTML personalizado según tipo de paradero
   */
  createStopIcon(stop, isSelected = false) {
    let className = 'custom-map-pin';
    let iconContent = '';

    if (isSelected) {
      className += ' pin-selected';
      iconContent = `
        <div class="pin-ring ring-selected"></div>
        <div class="pin-body body-selected">
          <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="15" rx="2"/>
            <circle cx="8" cy="18" r="2"/>
            <circle cx="16" cy="18" r="2"/>
            <path d="M3 11h18"/>
            <path d="M7 6h.01M17 6h.01"/>
          </svg>
        </div>
        <div class="pin-label-floating">${stop.shortName}</div>
      `;
    } else if (stop.isCFTLA) {
      className += ' pin-cftla';
      iconContent = `
        <div class="pin-ring ring-cftla"></div>
        <div class="pin-body body-cftla">
          <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="pin-badge-cftla">CFTLA</div>
      `;
    } else {
      className += ' pin-standard';
      iconContent = `
        <div class="pin-body body-standard">
          <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="15" rx="2"/>
            <circle cx="8" cy="18" r="2"/>
            <circle cx="16" cy="18" r="2"/>
            <path d="M3 11h18"/>
            <path d="M7 6h.01M17 6h.01"/>
          </svg>
        </div>
        <div class="pin-label-subtle">${stop.shortName}</div>
      `;
    }

    return L.divIcon({
      className: className,
      html: iconContent,
      iconSize: stop.isCFTLA ? [48, 48] : [38, 38],
      iconAnchor: stop.isCFTLA ? [24, 24] : [19, 19]
    });
  }

  /**
   * Renderizar marcadores de buses en tiempo real
   */
  renderActiveBuses() {
    BUSCFTLA_DATA.activeBuses.forEach((bus) => {
      const busIcon = this.createBusIcon(bus);
      const marker = L.marker(bus.coords, {
        icon: busIcon,
        zIndexOffset: 500
      }).addTo(this.map);

      marker.bindTooltip(`
        <div class="bus-popup-mini">
          <strong>${bus.line}</strong> · Patente: <code>${bus.plate}</code><br>
          <span style="color:#10B981">● ${bus.status}</span> · Vel: ${bus.speedKmH} km/h
        </div>
      `, { offset: [0, -14], direction: 'top' });

      this.busMarkers.set(bus.id, marker);
    });
  }

  /**
   * Crear icono dinámico de bus con rotación y colores de línea
   */
  createBusIcon(bus) {
    return L.divIcon({
      className: 'live-bus-marker',
      html: `
        <div class="bus-marker-wrapper" style="--line-color: ${bus.lineColor}">
          <div class="bus-bubble" style="background-color: ${bus.lineColor}">
            <svg class="bus-svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5">
              <rect x="3" y="3" width="18" height="15" rx="2"/>
              <circle cx="7.5" cy="18" r="2"/>
              <circle cx="16.5" cy="18" r="2"/>
              <path d="M3 10h18"/>
              <path d="M7 6h.01M17 6h.01"/>
            </svg>
            <span class="bus-plate-chip">${bus.plate}</span>
          </div>
          <div class="bus-radar-ping"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }

  /**
   * Seleccionar un paradero y actualizar interfaz
   */
  selectStop(stopId, shouldPan = true) {
    const previousId = this.selectedStopId;
    this.selectedStopId = stopId;

    // Actualizar icono anterior
    if (previousId && this.markers.has(previousId)) {
      const prevStop = BUSCFTLA_DATA.stops.find(s => s.id === previousId);
      if (prevStop) {
        this.markers.get(previousId).setIcon(this.createStopIcon(prevStop, false));
      }
    }

    // Actualizar nuevo marcador seleccionado
    const newStop = BUSCFTLA_DATA.stops.find(s => s.id === stopId);
    if (newStop && this.markers.has(stopId)) {
      this.markers.get(stopId).setIcon(this.createStopIcon(newStop, true));
      
      if (shouldPan && this.map) {
        this.map.flyTo(newStop.coords, 16, {
          animate: true,
          duration: 0.8
        });
      }
    }

    // Notificar al controlador de la aplicación
    if (window.busApp && typeof window.busApp.onStopSelected === 'function') {
      window.busApp.onStopSelected(newStop);
    }
  }

  /**
   * Simulación en tiempo real del movimiento de buses
   */
  startLiveBusSimulation() {
    let tick = 0;
    this.animationTimer = setInterval(() => {
      tick++;
      BUSCFTLA_DATA.activeBuses.forEach((bus, index) => {
        // Pequeño desplazamiento sinusoidal para simular circulación en calles de Lota
        const deltaLat = Math.sin((tick + index * 10) * 0.15) * 0.00018;
        const deltaLng = Math.cos((tick + index * 10) * 0.15) * 0.00022;

        const newLat = bus.coords[0] + deltaLat;
        const newLng = bus.coords[1] + deltaLng;
        const newCoords = [newLat, newLng];

        const marker = this.busMarkers.get(bus.id);
        if (marker) {
          marker.setLatLng(newCoords);
        }
      });
    }, 2500);
  }

  /**
   * Centrar mapa en CFTLA
   */
  centerOnCFTLA() {
    if (!this.map) return;
    this.map.flyTo(BUSCFTLA_DATA.institution.centerCoords, 16, {
      duration: 1
    });
    this.selectStop('stop-cftla');
  }

  /**
   * Obtener o simular ubicación del usuario
   */
  locateUser() {
    if (!this.map) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Verificar si está razonablemente cerca de Lota (-36 a -38 Lat)
          const isNearLota = (lat > -38.5 && lat < -36.0 && lng > -74.0 && lng < -72.0);
          const finalCoords = isNearLota ? [lat, lng] : [-37.0960, -73.1570];

          this.setUserLocationMarker(finalCoords, isNearLota);
        },
        (error) => {
          console.warn('Geolocalización no disponible, usando simulación en Lota:', error);
          this.setUserLocationMarker([-37.0960, -73.1570], false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      this.setUserLocationMarker([-37.0960, -73.1570], false);
    }
  }

  /**
   * Colocar marcador de usuario
   */
  setUserLocationMarker(coords, isReal = false) {
    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }

    const icon = L.divIcon({
      className: 'user-loc-pin',
      html: `
        <div class="user-pulse-glow"></div>
        <div class="user-dot"></div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    this.userLocationMarker = L.marker(coords, { icon: icon, zIndexOffset: 1000 }).addTo(this.map);
    this.userLocationMarker.bindTooltip(
      `<strong>${isReal ? 'Tu ubicación actual' : 'Tu ubicación (Simulada Lota)'}</strong>`,
      { permanent: false, direction: 'top' }
    ).openTooltip();

    this.map.flyTo(coords, 16, { duration: 1 });
  }
}

// Exportar clase
if (typeof window !== 'undefined') {
  window.BusCFTLAMap = BusCFTLAMap;
}
