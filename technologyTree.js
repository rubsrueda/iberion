// En technologyTree.js

const TECHNOLOGY_TREE_DATA = {
    // TIER 0 - INICIO
    "ORGANIZATION": {
        id: "ORGANIZATION",
        name: "Organización",
        description: "Fundamentos de la sociedad y el mando. Permite reclutar la unidad más básica.",
        sprite: "🤝", // Emoji de manos unidas
        cost: { researchPoints: 0 },
        unlocksUnits: ["Infantería Ligera","Columna de Suministro"], 
        unlocksStructures: [],
        prerequisites: [],
        position: { x: 0, y: 0 },
        tier: 0
    },

    // <<< NUEVA TECNOLOGÍA: Agricultura Militar, para desbloquear Pueblos >>>
    "AGRICULTURE": {
        id: "AGRICULTURE",
        name: "Agricultura Militar",
        description: "Entrenamiento de pobladores armados para la defensa territorial. Desbloquea la unidad Pueblo para fortalecer tus defensas.",
        sprite: "🌾",
        cost: { researchPoints: 15 },
        unlocksUnits: ["Pueblo"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -100, y: -60 },
        tier: 1
    },

    // =======================================================
    // RAMA DE INFRAESTRUCTURA Y ECONOMÍA (HACIA ABAJO)
    // =======================================================

    // TIER 1
    "ENGINEERING": {
        id: "ENGINEERING",
        name: "Ingeniería Civil",
        description: "Principios de construcción para conectar y desarrollar tu imperio.",
        sprite: "📐", // Emoji de escuadra
        cost: { researchPoints: 40 },
        unlocksUnits: ["Ingenieros"],
        unlocksStructures: ["Camino"],
        prerequisites: ["ORGANIZATION"],
        position: { x: 0, y: 120 },
        tier: 1
    },
    "MINING": {
        id: "MINING",
        name: "Minería",
        description: "Técnicas para la extracción eficiente de minerales y metales.",
        sprite: "⛏️", // Emoji de pico
        cost: { researchPoints: 25 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 150, y: 120 },
        tier: 1
    },
    "PROSPECTING": {
        id: "PROSPECTING",
        name: "Prospección",
        description: "Técnicas para identificar y explotar mejor los filones de oro.",
        sprite: "💰", // Emoji de saco de dinero
        cost: { researchPoints: 40 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["MINING"],
        position: { x: 250, y: 200 },
        tier: 2
    },
    "IRON_WORKING": {
        id: "IRON_WORKING",
        name: "Herrería",
        description: "El secreto para forjar hierro, un metal superior para armas y herramientas.",
        sprite: "⚙️", // Emoji de engranaje
        cost: { researchPoints: 50 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["MINING"],
        position: { x: 150, y: 200 },
        tier: 2
    },

    // <<< NUEVA TECNOLOGÍA: Navegación, para desbloquear barcos >>>
    "NAVIGATION": {
        id: "NAVIGATION",
        name: "Navegación",
        description: "Permite la construcción de astilleros y el dominio de los mares con barcos de guerra y pataches exploradores.",
        sprite: "🧭",
        cost: { researchPoints: 60 },
        unlocksUnits: ["Patache", "Barco de Guerra"],
        unlocksStructures: [], // Futuro: Astilleros
        prerequisites: ["ENGINEERING", "FORESTRY"], // Requiere madera e ingeniería
        position: { x: -150, y: 200 }, // Posición en la rama civil/maderera
        tier: 2
    },

    // TIER 2
    "FORTIFICATIONS": {
        id: "FORTIFICATIONS",
        name: "Fortificaciones",
        description: "El arte de la defensa. Permite crear bastiones para reclutar y defender.",
        sprite: "🧱", // Emoji de ladrillos
        cost: { researchPoints: 75 },
        unlocksUnits: [],
        unlocksStructures: ["Fortaleza"],
        prerequisites: ["ENGINEERING"],
        position: { x: 0, y: 200 },
        tier: 2
    },
    
    // =======================================================
    // RAMA MILITAR (HACIA ARRIBA)
    // =======================================================

     "DRILL_TACTICS": {
        id: "DRILL_TACTICS",
        name: "Tácticas de Formación",
        description: "Entrenamiento formalizado para crear infantería pesada y mandos de campo.",
        sprite: "⚔️",
        cost: { researchPoints: 25 },
        // <<< MODIFICACIÓN: Añadimos el Cuartel General >>>
        unlocksUnits: ["Infantería Pesada", "Cuartel General"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -200, y: -120 },
        tier: 1
    },

    "LEADERSHIP": {
        id: "LEADERSHIP",
        name: "Liderazgo",
        description: "Estudio del mando y la estrategia. Desbloquea la capacidad de asignar generales a las divisiones con Cuartel General.",
        sprite: "⭐",
        cost: { researchPoints: 30 },
        unlocksUnits: [], 
        unlocksStructures: [],
        prerequisites: ["DRILL_TACTICS"],
        position: { x: -400, y: -120 }, // Lo colocamos a la izquierda de las tácticas militares
        tier: 1
    },

    // <<< NUEVA TECNOLOGÍA: Medicina, para el Hospital de Campaña >>>
    "MEDICINE": {
        id: "MEDICINE",
        name: "Medicina",
        description: "Conocimientos anatómicos y sanitarios para tratar a los heridos en el campo de batalla.",
        sprite: "🧪",
        cost: { researchPoints: 50 },
        unlocksUnits: ["Hospital de Campaña"],
        unlocksStructures: [],
        prerequisites: ["FLETCHING"], // Lo ponemos en la rama de unidades a distancia como una rama de apoyo
        position: { x: 0, y: -220 }, // Lo ponemos donde estaba GUNPOWDER
        tier: 2
    },

    // <<< MODIFICACIÓN: Reubicamos la Pólvora >>>
    "GUNPOWDER": {
        id: "GUNPOWDER",
        name: "Pólvora",
        description: "Un descubrimiento revolucionario que cambia la faz de la guerra a distancia.",
        sprite: "💥",
        cost: { researchPoints: 70 },
        unlocksUnits: ["Arcabuceros"],
        unlocksStructures: [],
        prerequisites: ["MEDICINE", "IRON_WORKING"], // Ahora requiere Medicina y Herrería
        position: { x: 0, y: -320 }, // La movemos un tier más abajo
        tier: 3
    },

    // TIER 1 - Ramas principales
    "FLETCHING": {
        id: "FLETCHING",
        name: "Emplumado",
        description: "Mejora la aerodinámica de las flechas, permitiendo el uso de arcos de guerra.",
        sprite: "🏹", // Emoji de arco y flecha
        cost: { researchPoints: 30 },
        unlocksUnits: ["Arqueros"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 0, y: -120 },
        tier: 1
    },
    "ANIMAL_HUSBANDRY": {
        id: "ANIMAL_HUSBANDRY",
        name: "Ganadería",
        description: "Domesticación de caballos para el transporte y la guerra.",
        sprite: "🐎", // Emoji de caballo
        cost: { researchPoints: 35 },
        unlocksUnits: ["Caballería Ligera"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 200, y: -120 },
        tier: 1
    },

    "RECONNAISSANCE": {
        id: "RECONNAISSANCE",
        name: "Reconocimiento",
        description: "Tácticas de exploración para obtener información del campo de batalla. Desbloquea la unidad Explorador.",
        sprite: "🗺️", // Emoji de mapa
        cost: { researchPoints: 25 },
        unlocksUnits: ["Explorador"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 400, y: -120 }, // Lo ponemos a la derecha de ANIMAL_HUSBANDRY
        tier: 1
    },

    // TIER 2 - Unidades avanzadas
    "SIEGE_CRAFT": {
        id: "SIEGE_CRAFT",
        name: "Arte del Asedio",
        description: "Técnicas para construir y operar armas de asedio pesadas.",
        sprite: "💣", // Emoji de bomba
        cost: { researchPoints: 50 },
        unlocksUnits: ["Artillería"],
        unlocksStructures: [],
        prerequisites: ["DRILL_TACTICS", "ENGINEERING"],
        position: { x: -200, y: -220 },
        tier: 2
    },
    
    "STIRRUPS": {
        id: "STIRRUPS",
        name: "Estribos",
        description: "Permite a los jinetes luchar eficazmente desde la montura con armadura pesada.",
        sprite: "🏇", // Emoji de jinete
        cost: { researchPoints: 60 },
        unlocksUnits: ["Caballería Pesada"],
        unlocksStructures: [],
        prerequisites: ["ANIMAL_HUSBANDRY", "IRON_WORKING"],
        position: { x: 200, y: -220 },
        tier: 2
    },

    // TIER 3 - Unidad de Élite
    "MOUNTED_ARCHERY": {
        id: "MOUNTED_ARCHERY",
        name: "Arquería Montada",
        description: "Combina la movilidad de la caballería con el alcance de los arqueros.",
        sprite: "🐎🏹", // Combinación de emojis
        cost: { researchPoints: 90 },
        unlocksUnits: ["Arqueros a Caballo"],
        unlocksStructures: [],
        prerequisites: ["STIRRUPS", "FLETCHING"],
        position: { x: 100, y: -320 },
        tier: 3
    },

    // =======================================================
    // RAMA DE PRODUCCIÓN DE RECURSOS (Separada y simple)
    // =======================================================
    "FORESTRY": {
        id: "FORESTRY",
        name: "Silvicultura",
        description: "Gestión sostenible y eficiente de los recursos madereros.",
        sprite: "🌳", // Emoji de árbol
        cost: { researchPoints: 30 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -300, y: 0 },
        tier: 1
    },
    "MASONRY": {
        id: "MASONRY",
        name: "Albañilería",
        description: "Técnicas avanzadas para cortar y utilizar la piedra.",
        sprite: "🗿", // Emoji de moai o piedra
        cost: { researchPoints: 30 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -200, y: 0 },
        tier: 1
    },
    "SELECTIVE_BREEDING": {
        id: "SELECTIVE_BREEDING",
        name: "Cría Selectiva",
        description: "Mejora el rendimiento de los cultivos y el ganado. Aumenta la producción de Comida",
        sprite: "🌾", // Emoji de espiga de arroz
        cost: { researchPoints: 40 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 200, y: 0 },
        tier: 1
    },
    "COLONY": {
        id: "COLONY",
        name: "Colonización",
        description: "Permite establecer asentamientos permanentes y desarrollar tus fortalezas en centros de población.",
        sprite: "📜", // Un pergamino, como una cédula de fundación
        cost: { researchPoints: 100 },
        unlocksUnits: ["Colono"], // Desbloquea la unidad "Colono"
        unlocksStructures: ["Aldea", "Ciudad", "Metrópoli"], // Permite la construcción de estas estructuras
        prerequisites: ["ENGINEERING"], // Requerirá tener Ingeniería Civil
        position: { x: -100, y: 280 }, // Ubicada debajo de Ingeniería en el árbol visual
        tier: 3
    }
};

// Función para obtener los datos de una tecnología por su ID
function getTechnologyData(techId) {
    return TECHNOLOGY_TREE_DATA[techId] || null;
}

// Función para verificar si un jugador tiene los prerrequisitos para una tecnología
function hasPrerequisites(playerResearchedTechs, targetTechId) {
    const targetTech = TECHNOLOGY_TREE_DATA[targetTechId];
    if (!targetTech) return false;
    if (!targetTech.prerequisites || targetTech.prerequisites.length === 0) return true;

    for (const prereqId of targetTech.prerequisites) {
        if (!playerResearchedTechs.includes(prereqId)) {
            return false;
        }
    }
    return true;
}

// Función para obtener las tecnologías que un jugador puede investigar AHORA
function getAvailableTechnologies(playerResearchedTechs) {
    const available = [];
    for (const techId in TECHNOLOGY_TREE_DATA) {
        if (!playerResearchedTechs.includes(techId)) {
            if (hasPrerequisites(playerResearchedTechs, techId)) {
                available.push(TECHNOLOGY_TREE_DATA[techId]);
            }
        }
    }
    return available;
}