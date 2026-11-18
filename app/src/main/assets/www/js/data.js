/**
 * BusCFTLA - Datos Maestros y Configuración
 * Centro de Formación Técnica Lota Arauco (CFTLA) - Lota, Chile
 */

const BUSCFTLA_DATA = {
  institution: {
    name: "Centro de Formación Técnica Lota Arauco",
    shortName: "CFTLA",
    location: "Lota, Región del Biobío, Chile",
    centerCoords: [-37.0945, -73.1585],
    zoom: 15
  },

  profiles: {
    student: {
      id: "student-1",
      roleKey: "student",
      role: "Estudiante",
      name: "Constanza Morales P.",
      email: "constanza.morales@cftlotaarauco.cl",
      defaultPassword: "cftla2026",
      code: "2024-8507",
      institution: "CFTLA — Lota Arauco",
      module: "Técnico en Administración",
      careers: [
        "Técnico en Administración",
        "Técnico en Informática",
        "Mecánica Industrial",
        "Instrumentación y Automatización",
        "Construcción Civil",
        "Gastronomía Internacional"
      ],
      metrics: {
        routes: 4,
        trips: 27,
        alerts: 1
      },
      avatarInitial: "CM",
      themeAccent: "blue"
    },
    teacher: {
      id: "teacher-1",
      roleKey: "teacher",
      role: "Docente",
      name: "Prof. Rodrigo Soto",
      email: "rodrigo.soto@cftlotaarauco.cl",
      defaultPassword: "docente2026",
      code: "DOC-229",
      institution: "CFTLA — Lota Arauco",
      module: "Departamento Académico",
      departments: [
        "Departamento Académico",
        "Área Tecnologías de Información",
        "Área Administración y Negocios",
        "Área Industrial y Procesos",
        "Dirección de Docencia"
      ],
      metrics: {
        routes: 4,
        trips: 42,
        alerts: 0,
        punctuality: "99%"
      },
      avatarInitial: "RS",
      themeAccent: "amber"
    }
  },

  lines: [
    {
      id: "linea-a",
      name: "Línea A",
      label: "Línea A — Lota Alto / Polvorín",
      color: "#2563EB",
      bgColor: "rgba(37, 99, 235, 0.15)",
      borderColor: "#1D4ED8",
      frequency: "8–15 min",
      description: "Recorrido troncal entre Lota Alto, Pabellón Histórico y acceso directo CFTLA.",
      active: true,
      route: [
        [-37.0895, -73.1535],
        [-37.0915, -73.1610],
        [-37.0945, -73.1585],
        [-37.0955, -73.1545],
        [-37.0980, -73.1540],
        [-37.0945, -73.1585]
      ]
    },
    {
      id: "linea-b",
      name: "Línea B",
      label: "Línea B — Lota Bajo / Schwager / CFTLA",
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.15)",
      borderColor: "#047857",
      frequency: "10–20 min",
      description: "Conexión comercial entre Mercado Lota Bajo, sector costero y Campus CFTLA.",
      active: true,
      route: [
        [-37.1040, -73.1510],
        [-37.1018, -73.1528],
        [-37.0980, -73.1540],
        [-37.0945, -73.1585],
        [-37.0915, -73.1610]
      ]
    },
    {
      id: "linea-c",
      name: "Línea C",
      label: "Línea C — Interprovincial Coronel / Directo",
      color: "#D97706",
      bgColor: "rgba(217, 119, 6, 0.15)",
      borderColor: "#B45309",
      frequency: "15–25 min",
      description: "Servicio rápido de estudiantes que viajan desde Coronel y Lagunillas al CFTLA.",
      active: true,
      route: [
        [-37.1040, -73.1510],
        [-37.1018, -73.1528],
        [-37.0955, -73.1545],
        [-37.0945, -73.1585]
      ]
    },
    {
      id: "linea-d",
      name: "Línea D",
      label: "Línea D — Expreso Ruta 160 / Arauco",
      color: "#7C3AED",
      bgColor: "rgba(124, 58, 237, 0.15)",
      borderColor: "#6D28D9",
      frequency: "20–35 min",
      description: "Servicio de enlace sur para estudiantes de Chivilingo, Laraquete y Arauco.",
      active: true,
      route: [
        [-37.1120, -73.1490],
        [-37.1040, -73.1510],
        [-37.0980, -73.1540],
        [-37.0945, -73.1585]
      ]
    }
  ],

  stops: [
    {
      id: "stop-cftla",
      isCFTLA: true,
      name: "Entrada CFTLA (Campus Central)",
      shortName: "Campus CFTLA",
      coords: [-37.0945, -73.1585],
      address: "Av. Carlos Cousiño s/n, Lota Alto",
      description: "Acceso central CFT Lota Arauco. Talleres de especialidad, biblioteca central y edificio de docencia.",
      frequency: "5–12 min",
      timeToCFTLA: "¡Estás aquí!",
      minutesToCFTLA: 0,
      lines: ["Línea A", "Línea B", "Línea C", "Línea D"],
      nextBusSeconds: 195,
      nextBusLine: "Línea A",
      nextBusPlate: "BCDF-12",
      crowdLevel: "Moderada",
      isFavorite: true,
      waitingUsersCount: 4,
      isUserWaiting: false
    },
    {
      id: "stop-el-morro",
      isCFTLA: false,
      name: "Av. El Morro (Norte)",
      shortName: "El Morro (Norte)",
      coords: [-37.0915, -73.1610],
      address: "Av. El Morro esq. Pje. Los Mineros",
      description: "Costado acceso norte del Parque Isidora Cousiño. Alta afluencia en horarios matutinos de ingreso.",
      frequency: "15–25 min",
      timeToCFTLA: "8 min",
      minutesToCFTLA: 8,
      lines: ["Línea A", "Línea B"],
      nextBusSeconds: 1080,
      nextBusLine: "Línea B",
      nextBusPlate: "CFTR-44",
      crowdLevel: "Alta",
      isFavorite: false,
      waitingUsersCount: 3,
      isUserWaiting: false
    },
    {
      id: "stop-plaza-alto",
      isCFTLA: false,
      name: "Plaza de Armas (Lota Alto)",
      shortName: "Plaza Lota Alto",
      coords: [-37.0955, -73.1545],
      address: "Caupolicán con Aníbal Pinto",
      description: "Corazón cívico de Lota Alto frente al Centro Cultural. Conexión rápida a pie o en microbús al CFTLA.",
      frequency: "8–15 min",
      timeToCFTLA: "5 min",
      minutesToCFTLA: 5,
      lines: ["Línea A", "Línea C"],
      nextBusSeconds: 312,
      nextBusLine: "Línea A",
      nextBusPlate: "KJLP-89",
      crowdLevel: "Media",
      isFavorite: false,
      waitingUsersCount: 5,
      isUserWaiting: false
    },
    {
      id: "stop-lota-bajo",
      isCFTLA: false,
      name: "Lota Bajo (Mercado Central)",
      shortName: "Lota Bajo Centro",
      coords: [-37.1018, -73.1528],
      address: "Calle Serrano con Pedro Aguirre Cerda",
      description: "Paradero neurálgico del comercio en Lota Bajo y transbordo de colectivos locales hacia Lota Alto.",
      frequency: "10–20 min",
      timeToCFTLA: "14 min",
      minutesToCFTLA: 14,
      lines: ["Línea B", "Línea C"],
      nextBusSeconds: 560,
      nextBusLine: "Línea C",
      nextBusPlate: "PRXG-31",
      crowdLevel: "Muy Alta",
      isFavorite: false,
      waitingUsersCount: 7,
      isUserWaiting: false
    },
    {
      id: "stop-polvorin",
      isCFTLA: false,
      name: "Sector Polvorín / Cousiño",
      shortName: "Polvorín",
      coords: [-37.0895, -73.1535],
      address: "Calle Los Castaños s/n",
      description: "Sector residencial norte. Paradero de inicio de ruta hacia el campus.",
      frequency: "15–25 min",
      timeToCFTLA: "11 min",
      minutesToCFTLA: 11,
      lines: ["Línea A"],
      nextBusSeconds: 785,
      nextBusLine: "Línea A",
      nextBusPlate: "ZTHK-67",
      crowdLevel: "Baja",
      isFavorite: false,
      waitingUsersCount: 2,
      isUserWaiting: false
    },
    {
      id: "stop-terminal",
      isCFTLA: false,
      name: "Terminal de Transferencia Lota",
      shortName: "Terminal Lota",
      coords: [-37.1040, -73.1510],
      address: "Av. Costanera esq. Carrera",
      description: "Terminal principal de autobuses intercomunales (Lota-Concepción, Coronel y Arauco).",
      frequency: "5–12 min",
      timeToCFTLA: "18 min",
      minutesToCFTLA: 18,
      lines: ["Línea B", "Línea C", "Línea D"],
      nextBusSeconds: 430,
      nextBusLine: "Línea D",
      nextBusPlate: "LTYB-90",
      crowdLevel: "Muy Alta",
      isFavorite: false,
      waitingUsersCount: 6,
      isUserWaiting: false
    },
    {
      id: "stop-chivilingo",
      isCFTLA: false,
      name: "Acceso Sur (Chivilingo - Ruta 160)",
      shortName: "Acceso Sur / Ruta 160",
      coords: [-37.1120, -73.1490],
      address: "Empalme Ruta 160 / Chivilingo",
      description: "Parada de transbordo interurbano para estudiantes de las comunas de la provincia de Arauco.",
      frequency: "20–35 min",
      timeToCFTLA: "22 min",
      minutesToCFTLA: 22,
      lines: ["Línea D"],
      nextBusSeconds: 1310,
      nextBusLine: "Línea D",
      nextBusPlate: "DKWF-55",
      crowdLevel: "Media",
      isFavorite: false,
      waitingUsersCount: 2,
      isUserWaiting: false
    }
  ],

  // Buses simulados en tiempo real
  activeBuses: [
    {
      id: "bus-1",
      plate: "BCDF-12",
      line: "Línea A",
      lineColor: "#2563EB",
      coords: [-37.0930, -73.1595],
      speedKmH: 28,
      heading: 140,
      status: "En aproximación",
      targetStop: "stop-cftla",
      occupancy: "65%"
    },
    {
      id: "bus-2",
      plate: "CFTR-44",
      line: "Línea B",
      lineColor: "#059669",
      coords: [-37.0970, -73.1560],
      speedKmH: 34,
      heading: 320,
      status: "En ruta",
      targetStop: "stop-el-morro",
      occupancy: "80%"
    },
    {
      id: "bus-3",
      plate: "PRXG-31",
      line: "Línea C",
      lineColor: "#D97706",
      coords: [-37.1030, -73.1520],
      speedKmH: 22,
      heading: 350,
      status: "En parada",
      targetStop: "stop-lota-bajo",
      occupancy: "45%"
    },
    {
      id: "bus-4",
      plate: "LTYB-90",
      line: "Línea D",
      lineColor: "#7C3AED",
      coords: [-37.1080, -73.1500],
      speedKmH: 42,
      heading: 340,
      status: "En ruta rápida",
      targetStop: "stop-terminal",
      occupancy: "90%"
    }
  ],

  // Guía de Ayuda (Sección "¿Cómo usar BusCFTLA?")
  helpCards: [
    {
      id: "help-1",
      icon: "map",
      title: "Ver el mapa",
      description: "Visualiza toda la ciudad de Lota, el trazado de las calles principales y los paraderos oficiales del servicio CFTLA con actualización constante."
    },
    {
      id: "help-2",
      icon: "marker",
      title: "Seleccionar un paradero",
      description: "Toca cualquier marcador azul o el marcador verde de CFTLA para desplegar el panel inferior con los horarios, líneas que pasan y estado en vivo."
    },
    {
      id: "help-3",
      icon: "clock",
      title: "Frecuencia de buses",
      description: "Consulta los rangos estimados en minutos (ej. 5–12 min o 15–25 min) que indican el intervalo de paso regular de cada línea en el punto seleccionado."
    },
    {
      id: "help-4",
      icon: "navigation",
      title: "Tiempo al CFTLA",
      description: "Calcula cuántos minutos de trayecto te separan de la sede principal de Lota Alto. En la entrada del campus verás el indicador '¡Estás aquí!'."
    },
    {
      id: "help-5",
      icon: "user",
      title: "Tu perfil",
      description: "Accede desde el avatar superior para revisar tus datos académicos, cambiar entre perfil Estudiante y Docente, y gestionar las preferencias de la app."
    },
    {
      id: "help-6",
      icon: "alert-triangle",
      title: "Centro de denuncias",
      description: "Reporta incidentes de conducta, velocidad o incumplimiento de frecuencia con la matrícula del bus para la fiscalización del servicio CFTLA."
    }
  ],

  // Denuncias demo iniciales
  initialComplaints: [
    {
      id: "DEN-2026-0814",
      date: "10/10/2026 14:32",
      plate: "BCDF-12",
      line: "Línea A",
      category: "No se detuvo en paradero",
      reason: "El autobús no se detuvo en el paradero de Av. El Morro a pesar de estar señalizando 3 estudiantes con pase escolar.",
      status: "En revisión",
      reporter: "Constanza Morales P. (Estudiante)"
    },
    {
      id: "DEN-2026-0792",
      date: "08/10/2026 08:15",
      plate: "PRXG-31",
      line: "Línea C",
      category: "Exceso de velocidad",
      reason: "Circulación a alta velocidad por la bajada de Carlos Cousiño con lluvia ligera.",
      status: "Aceptada e informada a la empresa",
      reporter: "Prof. Rodrigo Soto (Docente)"
    }
  ]
};

// Exportar globalmente para navegador y módulos
if (typeof window !== 'undefined') {
  window.BUSCFTLA_DATA = BUSCFTLA_DATA;
}
