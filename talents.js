// talents.js (Versión 100% Completa, Trébol Compacto)

const TALENT_DEFINITIONS = {
    // === 18 Talentos de INFANTERÍA ===
    'inf_1': { name: "Hacha Afilada", maxLevels: 5, description: "Aumenta el Ataque de la Infantería en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'attack', is_percentage: true, scope: 'combat', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_2': { name: "Coraza Férrea", maxLevels: 5, description: "Aumenta la Defensa de la Infantería en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'defense', is_percentage: true, scope: 'combat', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_3': { name: "Paso Ligero", maxLevels: 3, description: "Aumenta la Velocidad de Marcha de la Infantería un {X}%.", values: [3, 6, 10], effect: { stat: 'movement', is_percentage: true, scope: 'movimiento', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_4': { name: "Sangre de Hierro", maxLevels: 3, description: "Aumenta la Salud de la Infantería en {X}%.", values: [2, 4, 6], effect: { stat: 'health', is_percentage: true, scope: 'combat', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_5': { name: "Formación Cerrada", maxLevels: 3, description: "Reduce el daño de contraataque recibido un {X}%.", values: [5, 10, 15], effect: { stat: 'counterattack_damage_reduction', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'inf_6': { name: "Filo de Acero", maxLevels: 3, description: "Aumenta el daño de los ataques normales un {X}%.", values: [1, 2, 3], effect: { stat: 'normal_attack_damage', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'inf_7': { name: "Tenacidad", maxLevels: 3, description: "Aumenta la Salud de la Infantería en +{X}.", values: [20, 40, 60], effect: { stat: 'health', is_percentage: false, scope: 'combat', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_8': { name: "Furia del Guerrero", maxLevels: 1, description: "Aumenta el Ataque un 5% si la moral es > 80%.", values: [5], effect: { stat: 'attack', is_percentage: true, scope: 'combat', condition: 'morale_high' } },
    'inf_9': { name: "Golpe Incapacitante", maxLevels: 1, description: "Los ataques normales tienen un 10% de probabilidad de reducir el ataque del objetivo un 10%.", values: [10], effect: { stat: 'chance_to_debuff_attack', is_percentage: true, scope: 'ataque', chance: 10 } },
    'inf_10': { name: "Cuerpo Fuerte", maxLevels: 3, description: "Reduce el daño de habilidad recibido un {X}%.", values: [2.5, 5, 7.5], effect: { stat: 'skill_damage_reduction', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'inf_11': { name: "Último Bastión", maxLevels: 1, description: "Aumenta la Defensa un 20% si la salud es < 30%.", values: [20], effect: { stat: 'defense', is_percentage: true, scope: 'combat', condition: 'health_low' } },
    'inf_12': { name: "Ataque de Oportunidad", maxLevels: 1, description: "Inflige un 20% más de daño a objetivos ralentizados.", values: [20], effect: { stat: 'damage_vs_slowed', is_percentage: true, scope: 'ataque' } },
    'inf_13': { name: "Muro de Escudos", maxLevels: 1, description: "Al ser atacado, 10% de probabilidad de reducir todo el daño recibido en 15% por 2s.", values: [15], effect: { stat: 'chance_to_reduce_damage_taken', is_percentage: true, scope: 'combat', chance: 10 } },
    'inf_14': { name: "Maestría de Infantería", maxLevels: 3, description: "Aumenta el Ataque de la Infantería en +{X}.", values: [20, 40, 60], effect: { stat: 'attack', is_percentage: false, scope: 'combat', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'inf_15': { name: "Indomable", maxLevels: 1, description: "Inmune a los efectos de reducción de moral.", values: [1], effect: { stat: 'morale_reduction_immunity', is_percentage: false, scope: 'turno' } },
    'inf_16': { name: "Escudo Pesado", maxLevels: 1, description: "Aumenta la Defensa de la Infantería un 15%, pero reduce su Movimiento en 1.", values: [15, -1], effect: { stat: 'tradeoff_defense_movement', scope: 'combat' } },
    'inf_17': { name: "Golpe Despiadado", maxLevels: 1, description: "Aumenta un 15% el daño a enemigos con menos del 50% de vida.", values: [15], effect: { stat: 'damage_vs_low_hp', is_percentage: true, scope: 'ataque' } },
    'inf_18': { name: "Inquebrantable", maxLevels: 1, description: "Cuando la salud baja del 50%, el daño recibido se reduce un 25%.", values: [25], effect: { stat: 'conditional_damage_reduction', is_percentage: true, scope: 'combat', condition: 'health_low' } },
// === 18 Talentos de Caballería ===
    'cav_1': { name: "Carga Brutal", maxLevels: 5, description: "Aumenta el Ataque de la Caballería en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'attack', is_percentage: true, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_2': { name: "Monturas Robustas", maxLevels: 5, description: "Aumenta la Salud de la Caballería en {X}%.", values: [1, 2, 3, 4, 5], effect: { stat: 'health', is_percentage: true, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_3': { name: "Crines al Viento", maxLevels: 3, description: "Aumenta la Velocidad de Marcha de la Caballería en {X}%.", values: [3, 6, 10], effect: { stat: 'movement', is_percentage: true, scope: 'movimiento', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_4': { name: "Brida Reforzada", maxLevels: 3, description: "Aumenta la Defensa de la Caballería en {X}%.", values: [2, 4, 6], effect: { stat: 'defense', is_percentage: true, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_5': { name: "Carga de Disrupción", maxLevels: 1, description: "La primera carga reduce la defensa del objetivo un 10% por 3s.", values: [10], effect: { stat: 'first_hit_defense_debuff', is_percentage: true, scope: 'ataque' } },
    'cav_6': { name: "Embestida", maxLevels: 3, description: "Aumenta el daño de los ataques normales un {X}%.", values: [1, 2, 3], effect: { stat: 'normal_attack_damage', is_percentage: true, scope: 'combat' } },
    'cav_7': { name: "Maniobras Evasivas", maxLevels: 3, description: "Aumenta la Defensa contra ataques a distancia un {X}%.", values: [5, 10, 15], effect: { stat: 'ranged_defense', is_percentage: true, scope: 'combat' } },
    'cav_8': { name: "Ataque Relámpago", maxLevels: 1, description: "Aumenta la Iniciativa de la Caballería en 25.", values: [25], effect: { stat: 'initiative', is_percentage: false, scope: 'ataque', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_9': { name: "Espuelas Afiladas", maxLevels: 1, description: "La primera carga al entrar en combate inflige un 15% de daño extra.", values: [15], effect: { stat: 'first_hit_damage_increase', is_percentage: true, scope: 'ataque' } },
    'cav_10': { name: "Furia Incesante", maxLevels: 3, description: "Aumenta el daño de habilidad un {X}% cuando se lidera caballería.", values: [2, 4, 6], effect: { stat: 'skill_damage', is_percentage: true, scope: 'ataque', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_11': { name: "Ímpetu", maxLevels: 1, description: "Tras usar una habilidad, el daño del siguiente ataque normal aumenta un 25%.", values: [25], effect: { stat: 'post_skill_normal_attack_buff', is_percentage: true, scope: 'ataque' } },
    'cav_12': { name: "Persecución", maxLevels: 1, description: "Inflige un 10% más de daño a unidades que intentan retirarse.", values: [10], effect: { stat: 'damage_vs_retreating', is_percentage: true, scope: 'ataque' } },
    'cav_13': { name: "Caballería de Élite", maxLevels: 3, description: "Aumenta Ataque y Velocidad de Marcha de la Caballería en {X}%.", values: [1, 2, 3], effect: { stat: 'multi_stat_cavalry', is_percentage: true, scope: 'movimiento' } },
    'cav_14': { name: "Galope de Trueno", maxLevels: 1, description: "Al usar una habilidad, las tropas enemigas cercanas sufren una pequeña reducción de velocidad.", values: [10], effect: { stat: 'aoe_slow_on_skill_use', is_percentage: true, scope: 'ataque' } },
    'cav_15': { name: "Corazón de Jinete", maxLevels: 1, description: "Reduce la duración de efectos de control un 30%.", values: [30], effect: { stat: 'control_reduction', is_percentage: true, scope: 'combat' } },
    'cav_16': { name: "Resolución del Jinete", maxLevels: 3, description: "Aumenta el ataque de la Caballería en +{X}.", values: [20, 40, 60], effect: { stat: 'attack', is_percentage: false, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_17': { name: "Armadura de Batalla", maxLevels: 3, description: "Aumenta la defensa de la Caballería en +{X}.", values: [20, 40, 60], effect: { stat: 'defense', is_percentage: false, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'cav_18': { name: "Carga de Huracán", maxLevels: 1, description: "Al entrar en combate, la caballería inflige daño de habilidad adicional (Poder 400).", values: [400], effect: { stat: 'on_enter_combat_skill_damage', is_percentage: false, scope: 'ataque', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
// === 18 Talentos de Arqueros ===
    'arc_1': { name: "Cuerda Tensada", maxLevels: 5, description: "Aumenta el Ataque de las tropas a distancia en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'attack', is_percentage: true, scope: 'combat', filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería', 'Arcabuceros'] } } },
    'arc_2': { name: "Carcaj Ligero", maxLevels: 5, description: "Aumenta la Salud de las tropas a distancia en {X}%.", values: [1, 2, 3, 4, 5], effect: { stat: 'health', is_percentage: true, scope: 'combat', filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería', 'Arcabuceros'] } } },
    'arc_3': { name: "Ojo de Halcón", maxLevels: 1, description: "Aumenta el Alcance de las tropas a distancia en 1.", values: [1], effect: { stat: 'attackRange', is_percentage: false, scope: 'ataque', filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería', 'Arcabuceros'] } } },
    'arc_4': { name: "Tiro Rápido", maxLevels: 3, description: "Aumenta la Iniciativa de las tropas a distancia en {X}.", values: [5, 10, 15], effect: { stat: 'initiative', is_percentage: false, scope: 'ataque', filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería', 'Arcabuceros'] } } },
    'arc_5': { name: "Flechas de Bodkin", maxLevels: 3, description: "Los ataques normales ignoran un {X}% de la defensa del objetivo.", values: [2, 4, 6], effect: { stat: 'defense_penetration', is_percentage: true, scope: 'ataque' } },
    'arc_6': { name: "Puntería Mortal", maxLevels: 3, description: "Aumenta la probabilidad de golpe crítico un {X}%." , values: [1, 2, 3], effect: { stat: 'critical_chance', is_percentage: true, scope: 'ataque' } },
    'arc_7': { name: "Estacas", maxLevels: 3, description: "Aumenta la Defensa contra unidades cuerpo a cuerpo un {X}%." , values: [5, 10, 15], effect: { stat: 'defense_vs_melee', is_percentage: true, scope: 'combat' } },
    'arc_8': { name: "Disparo Lacerante", maxLevels: 1, description: "Los golpes críticos aplican un efecto de sangrado leve.", values: [1], effect: { stat: 'bleed_on_crit', is_percentage: false, scope: 'ataque' } },
    'arc_9': { name: "Andanada", maxLevels: 1, description: "Los ataques normales tienen un 10% de probabilidad de reducir la defensa del objetivo un 10%." , values: [10], effect: { stat: 'chance_to_debuff_defense', is_percentage: true, scope: 'ataque', chance: 10 } },
    'arc_10': { name: "Fuego de Supresión", maxLevels: 3, description: "Los ataques tienen una pequeña probabilidad de reducir la iniciativa del objetivo." , values: [10], effect: { stat: 'chance_to_debuff_initiative', is_percentage: false, scope: 'ataque', chance: 10 } },
    'arc_11': { name: "Reposicionar", maxLevels: 1, description: "Tras ser atacado, gana +15% de velocidad por 2 segundos.", values: [15], effect: { stat: 'speed_buff_on_hit', is_percentage: true, scope: 'combat' } },
    'arc_12': { name: "Tiro a la Rodilla", maxLevels: 1, description: "Probabilidad de reducir la velocidad de movimiento del objetivo.", values: [10], effect: { stat: 'chance_to_slow', is_percentage: true, scope: 'ataque', chance: 10 } },
    'arc_13': { name: "Precisión", maxLevels: 5, description: "Aumenta el daño de habilidad un {X}%." , values: [2, 4, 6, 8, 10], effect: { stat: 'skill_damage', is_percentage: true, scope: 'ataque' } },
    'arc_14': { name: "Tácticas de Arquería", maxLevels: 3, description: "Aumenta el ataque de las tropas a distancia en +{X}." , values: [20, 40, 60], effect: { stat: 'attack', is_percentage: false, scope: 'combat', filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería', 'Arcabuceros'] } } },
    'arc_15': { name: "Salva Fulminante", maxLevels: 1, description: "La primera habilidad utilizada en combate inflige un 20% de daño extra.", values: [20], effect: { stat: 'first_skill_damage_increase', is_percentage: true, scope: 'ataque' } },
    'arc_16': { name: "Maestría con el Arco", maxLevels: 3, description: "Aumenta el Ataque y la Salud de las tropas a distancia un {X}%." , values: [1, 2, 3], effect: { stat: 'multi_stat_ranged', is_percentage: true, scope: 'combat' } },
    'arc_17': { name: "Disparo Doble", maxLevels: 1, description: "El primer ataque normal de la batalla dispara una flecha extra (50% de daño)." , values: [50], effect: { stat: 'first_attack_double_shot', is_percentage: true, scope: 'ataque' } },
    'arc_18': { name: "Lluvia de Flechas", maxLevels: 1, description: "Los ataques normales tienen un 10% de probabilidad de golpear una segunda vez (50% de daño)." , values: [50], effect: { stat: 'chance_for_double_shot', is_percentage: true, scope: 'ataque', chance: 10 } },
// === 18 Talentos de Liderazgo ===
    'lead_1': { name: "Tácticas Mixtas", maxLevels: 1, description: "Los talentos de este árbol solo se activan si la división contiene al menos 2 tipos de tropa diferentes.", values: [2], effect: { stat: 'requirement_mixed_troops', is_percentage: false, scope: 'combat' } },
    'lead_2': { name: "Ataque Coordinado", maxLevels: 5, description: "Aumenta el Ataque de todas las tropas un {X}%.", values: [1, 2, 3, 4, 5], effect: { stat: 'attack', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'lead_3': { name: "Defensa Coordinada", maxLevels: 5, description: "Aumenta la Defensa de todas las tropas un {X}%.", values: [1, 2, 3, 4, 5], effect: { stat: 'defense', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'lead_4': { name: "Unidad Blindada", maxLevels: 5, description: "Aumenta la Salud de todas las tropas un {X}%.", values: [1, 2, 3, 4, 5], effect: { stat: 'health', is_percentage: true, scope: 'combat', filters: { category: ['all'] } } },
    'lead_5': { name: "Marcha Rápida", maxLevels: 3, description: "Aumenta la Velocidad de Marcha un {X}%." , values: [2, 4, 6], effect: { stat: 'movement', is_percentage: true, scope: 'movimiento', filters: { category: ['all'] } } },
    'lead_6': { name: "Formación Cerrada", maxLevels: 3, description: "Reduce el daño en área recibido un {X}%." , values: [5, 10, 15], effect: { stat: 'aoe_damage_reduction', is_percentage: true, scope: 'combat' } },
    'lead_7': { name: "Tácticas de Flanqueo", maxLevels: 3, description: "Aumenta el daño infligido al flanquear un {X}%." , values: [5, 10, 15], effect: { stat: 'flanking_damage', is_percentage: true, scope: 'ataque' } },
    'lead_8': { name: "Arenga", maxLevels: 1, description: "Al entrar en combate, aumenta la moral de las tropas en 100.", values: [100], effect: { stat: 'on_enter_combat_morale_gain', is_percentage: false, scope: 'turno' } },
    'lead_9': { name: "Voluntad Férrea", maxLevels: 1, description: "Reduce la duración de efectos de control (silencio, desarme) un 30%." , values: [30], effect: { stat: 'control_reduction', is_percentage: true, scope: 'combat' } },
    'lead_10': { name: "Tácticas Furtivas", maxLevels: 3, description: "Reduce el daño de habilidad recibido un {X}%." , values: [2, 4, 6], effect: { stat: 'skill_damage_reduction', is_percentage: true, scope: 'combat' } },
    'lead_11': { name: "Vestido para la Ocasión", maxLevels: 1, description: "Reduce el daño recibido de atalayas un 10%." , values: [10], effect: { stat: 'watchtower_damage_reduction', is_percentage: true, scope: 'combat' } },
    'lead_12': { name: "Ataque Total", maxLevels: 1, description: "Aumenta el Ataque de la división un 3% pero reduce la defensa un 3%." , values: [3, -3], effect: { stat: 'tradeoff_attack_defense', is_percentage: true, scope: 'combat' } },
    'lead_13': { name: "Recursos de Batalla", maxLevels: 1, description: "Tras una victoria, cura un 5% de las tropas levemente heridas.", values: [5], effect: { stat: 'post_battle_heal', is_percentage: true, scope: 'fin' } },
    'lead_14': { name: "Nombre del Viento", maxLevels: 3, description: "Aumenta la velocidad de marcha fuera de combate un {X}%." , values: [3, 6, 10], effect: { stat: 'out_of_combat_speed', is_percentage: true, scope: 'movimiento' } },
    'lead_15': { name: "Estandartes de Guerra", maxLevels: 1, description: "Aumenta el Ataque de divisiones aliadas cercanas un 2%." , values: [2], effect: { stat: 'nearby_ally_attack_buff', is_percentage: true, scope: 'combat' } },
    'lead_16': { name: "Presencia Inspiradora", maxLevels: 3, description: "Aumenta la Defensa de todas las tropas en +{X}." , values: [20, 40, 60], effect: { stat: 'defense', is_percentage: false, scope: 'combat', filters: { category: ['all'] } } },
    'lead_17': { name: "Fuerza en la Unión", maxLevels: 1, description: "Por cada tipo de tropa diferente, el daño aumenta un 1.5%." , values: [1.5], effect: { stat: 'damage_per_troop_type', is_percentage: true, scope: 'ataque' } },
    'lead_18': { name: "Fuerza Combinada", maxLevels: 1, description: "Si la división tiene 3 tipos de tropa diferentes, el daño de todas aumenta un 15%." , values: [15], effect: { stat: 'conditional_damage', is_percentage: true, scope: 'ataque', condition: 'three_troop_types' } },
// === 18 Talentos de movimiento ===
    'mob_1': { name: "Paso Veloz", maxLevels: 5, description: "Aumenta la Velocidad de Marcha en un {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'movement', is_percentage: true, scope: 'movimiento' } },
    'mob_2': { name: "Acondicionamiento", maxLevels: 5, description: "Reduce el daño por atrición (sin suministro) en un {X}%.", values: [10, 20, 30, 40, 50], effect: { stat: 'attrition_damage_reduction', is_percentage: true, scope: 'turno' } },
    'mob_3': { name: "Saqueo Rápido", maxLevels: 1, description: "Saquear un hexágono ya no consume el punto de acción de ataque de la unidad.", values: [1], effect: { stat: 'free_pillage_action', is_percentage: false, scope: 'ataque' } },
    'mob_4': { name: "Pathfinding", maxLevels: 3, description: "Reduce el coste de movimiento en bosques y colinas en {X}%.", values: [10, 20, 30], effect: { stat: 'terrain_cost_reduction', is_percentage: true, scope: 'movimiento' } },
    'mob_5': { name: "Espionaje", maxLevels: 1, description: "Aumenta el rango de visión de la división en 2.", values: [2], effect: { stat: 'visionRange', is_percentage: false, scope: 'movimiento' } },
    'mob_6': { name: "Botín de Guerra", maxLevels: 3, description: "Gana un {X}% más de oro al saquear.", values: [10, 20, 30], effect: { stat: 'pillage_gold_gain', is_percentage: true, scope: 'ataque' } },
    'mob_7': { name: "Alerta Temprana", maxLevels: 3, description: "Reduce el daño recibido en los primeros 10s de combate en {X}%.", values: [5, 10, 15], effect: { stat: 'early_combat_damage_reduction', is_percentage: true, scope: 'combat' } },
    'mob_8': { name: "Emboscada", maxLevels: 1, description: "Aumenta el daño infligido un 10% si se ataca a un enemigo que no está en combate.", values: [10], effect: { stat: 'damage_vs_idle', is_percentage: true, scope: 'ataque' } },
    'mob_9': { name: "Retirada Táctica", maxLevels: 3, description: "Reduce el daño recibido un {X}% mientras la unidad se está retirando.", values: [10, 20, 30], effect: { stat: 'retreating_damage_reduction', is_percentage: true, scope: 'movimiento' } },
    'mob_10': { name: "Monturas Ligeras", maxLevels: 3, description: "Aumenta la Velocidad de Marcha de la Caballería en un {X}% adicional.", values: [3, 6, 10], effect: { stat: 'movement', is_percentage: true, scope: 'movimiento', filters: { category: ['light_cavalry', 'heavy_cavalry'] } } },
    'mob_11': { name: "Vanguardia", maxLevels: 1, description: "Aumenta la velocidad de la división un 10% adicional si su salud es > 80%.", values: [10], effect: { stat: 'conditional_speed', is_percentage: true, scope: 'movimiento', condition: 'health_high' } },
    'mob_12': { name: "Partida Apresurada", maxLevels: 1, description: "Al salir de una estructura aliada, gana +30% de Velocidad de Marcha durante 10 segundos.", values: [30], effect: { stat: 'on_exit_structure_speed_buff', is_percentage: true, scope: 'movimiento' } },
    'mob_13': { name: "Supervivencia", maxLevels: 5, description: "Aumenta la Defensa un {X}%." , values: [1, 2, 3, 4, 5], effect: { stat: 'defense', is_percentage: true, scope: 'combat' } },
    'mob_14': { name: "Marcha Imparable", maxLevels: 3, description: "Probabilidad de ser inmune a efectos de ralentización.", values: [10, 20, 30], effect: { stat: 'slow_immunity_chance', is_percentage: true, scope: 'movimiento' } },
    'mob_15': { name: "Incursión Veloz", maxLevels: 1, description: "Al entrar en territorio enemigo, gana +10% de Velocidad por 10s.", values: [10], effect: { stat: 'on_enter_enemy_territory_speed_buff', is_percentage: true, scope: 'movimiento' } },
    'mob_16': { name: "Reconocimiento", maxLevels: 1, description: "Reduce la niebla de guerra en un radio mayor.", values: [1], effect: { stat: 'fog_of_war_reduction', is_percentage: false, scope: 'movimiento' } },
    'mob_17': { name: "Paso Fantasma", maxLevels: 1, description: "La primera vez que la unidad es atacada, esquiva el ataque por completo (solo 1 vez por batalla).", values: [1], effect: { stat: 'first_hit_dodge', is_percentage: false, scope: 'combat' } },
    'mob_18': { name: "Viajero Incansable", maxLevels: 1, description: "La división ya no sufre penalización de movimiento en bosques o colinas.", values: [1], effect: { stat: 'terrain_cost_negation', is_percentage: false, scope: 'movimiento' } },
// === 18 Talentos de Asedio ===
    'siege_1': { name: "Trabajo Pesado", maxLevels: 5, description: "Aumenta el Ataque de las unidades de artillería en {X}%.", values: [3, 6, 9, 12, 15], effect: { stat: 'attack', is_percentage: true, scope: 'combat', filters: { type: ['Artillería'] } } },
    'siege_2': { name: "Chasis Reforzado", maxLevels: 5, description: "Aumenta la Salud de las unidades de artillería en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'health', is_percentage: true, scope: 'combat', filters: { type: ['Artillería'] } } },
    'siege_3': { name: "Manteletes", maxLevels: 5, description: "Reduce el daño recibido de guarniciones en {X}%.", values: [5, 10, 15, 20, 25], effect: { stat: 'damage_from_garrison_reduction', is_percentage: true, scope: 'combat' } },
    'siege_4': { name: "Pólvora Mejorada", maxLevels: 3, description: "Aumenta el daño de ataque normal un {X}%." , values: [2, 4, 6], effect: { stat: 'normal_attack_damage', is_percentage: true, scope: 'combat' } },
    'siege_5': { name: "Tierra Quemada", maxLevels: 1, description: "Al atacar una ciudad, la producción de recursos de la misma se reduce un 10%.", values: [10], effect: { stat: 'city_production_debuff', is_percentage: true, scope: 'ataque' } },
    'siege_6': { name: "Balística", maxLevels: 1, description: "Aumenta el Alcance de la Artillería en 1.", values: [1], effect: { stat: 'attackRange', is_percentage: false, scope: 'ataque', filters: { type: ['Artillería'] } } },
    'siege_7': { name: "Proyectiles Pesados", maxLevels: 3, description: "Ataques normales tienen una probabilidad de reducir la defensa de la guarnición un {X}%." , values: [5, 10, 15], effect: { stat: 'chance_to_debuff_garrison_defense', is_percentage: true, scope: 'ataque', chance: 15 } },
    'siege_8': { name: "Arietes", maxLevels: 1, description: "La Infantería gana +100% de daño a estructuras, pero su ataque a tropas se reduce un 25%." , values: [100, -25], effect: { stat: 'tradeoff_damage_vs_structure_unit', is_percentage: true, scope: 'ataque', filters: { category: ['light_infantry', 'heavy_infantry'] } } },
    'siege_9': { name: "Sabotaje", maxLevels: 1, description: "Probabilidad de desactivar temporalmente una torre defensiva de la ciudad.", values: [10], effect: { stat: 'chance_to_disable_tower', is_percentage: false, scope: 'ataque', chance: 10 } },
    'siege_10': { name: "Cadena de Suministro", maxLevels: 3, description: "Reduce el consumo de comida de la división un {X}%." , values: [10, 20, 30], effect: { stat: 'food_upkeep_reduction', is_percentage: true, scope: 'turno' } },
    'siege_11': { name: "Moral de Asedio", maxLevels: 3, description: "Aumenta la moral de la división al atacar estructuras.", values: [10, 20, 30], effect: { stat: 'morale_on_siege', is_percentage: false, scope: 'ataque' } },
    'siege_12': { name: "Último Recurso", maxLevels: 1, description: "Si la división está a punto de ser destruida, se vuelve invulnerable por 3 segundos.", values: [3], effect: { stat: 'invulnerability_on_near_death', is_percentage: false, scope: 'combat' } },
    'siege_13': { name: "Ingeniería de Asedio", maxLevels: 5, description: "Aumenta el daño infligido a ciudades y fortalezas un {X}%." , values: [5, 10, 15, 20, 25], effect: { stat: 'damage_vs_structure', is_percentage: true, scope: 'ataque' } },
    'siege_14': { name: "Metralla", maxLevels: 1, description: "Los ataques de la artillería infligen un 5% de su daño a los regimientos cercanos al objetivo.", values: [5], effect: { stat: 'artillery_splash_damage', is_percentage: true, scope: 'ataque', filters: { type: ['Artillería'] } } },
    'siege_15': { name: "Fuego Concentrado", maxLevels: 1, description: "Cada ataque consecutivo al mismo objetivo aumenta el daño en 1% (máx 10%).", values: [1, 10], effect: { stat: 'ramping_damage', is_percentage: true, scope: 'ataque' } },
    'siege_16': { name: "Acorazado", maxLevels: 3, description: "Aumenta la Defensa de la artillería en +{X}." , values: [20, 40, 60], effect: { stat: 'defense', is_percentage: false, scope: 'combat', filters: { type: ['Artillería'] } } },
    'siege_17': { name: "Mecanismos Precisos", maxLevels: 3, description: "Aumenta la iniciativa de la artillería en {X}." , values: [5, 10, 15], effect: { stat: 'initiative', is_percentage: false, scope: 'ataque', filters: { type: ['Artillería'] } } },
    'siege_18': { name: "Demoledor", maxLevels: 1, description: "Los ataques contra estructuras infligen un 10% de su daño a 3 regimientos de la guarnición al azar.", values: [10], effect: { stat: 'structure_attack_cleave', is_percentage: true, scope: 'ataque' } },
// === 18 Talentos generales ===
    'garrison_1': { name: "Guardia de la Ciudad", maxLevels: 5, description: "Aumenta la Defensa de la guarnición en {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'garrison_defense', is_percentage: true, scope: 'combat' } },
    'garrison_2': { name: "Muros de Escudos", maxLevels: 5, description: "Aumenta el daño de contraataque de la guarnición en {X}%.", values: [3, 6, 9, 12, 15], effect: { stat: 'garrison_counterattack_damage', is_percentage: true, scope: 'combat' } },
    'garrison_3': { name: "Aceite Hirviendo", maxLevels: 1, description: "Las unidades cuerpo a cuerpo que atacan esta guarnición reciben daño leve cada turno.", values: [100], effect: { stat: 'garrison_damage_aura_melee', is_percentage: false, scope: 'combat' } },
    'garrison_4': { name: "Almenas", maxLevels: 1, description: "Las tropas a distancia en esta guarnición tienen un 10% de prob. de atacar una vez extra.", values: [10], effect: { stat: 'garrison_ranged_extra_attack_chance', is_percentage: false, scope: 'ataque', chance: 10 } },
    'garrison_5': { name: "Reservas", maxLevels: 3, description: "Aumenta la Salud de los regimientos de la guarnición en {X}%.", values: [2, 4, 6], effect: { stat: 'garrison_health', is_percentage: true, scope: 'combat' } },
    'garrison_6': { name: "Tácticas de Embudo", maxLevels: 1, description: "Los atacantes sufren una penalización de -5% de ataque.", values: [5], effect: { stat: 'garrison_attacker_debuff_attack', is_percentage: true, scope: 'combat' } },
    'garrison_7': { name: "Disciplina Férrea", maxLevels: 3, description: "Reduce el daño de habilidad recibido un {X}%." , values: [5, 10, 15], effect: { stat: 'garrison_skill_damage_reduction', is_percentage: true, scope: 'combat' } },
    'garrison_8': { name: "Maestro Arquitecto", maxLevels: 3, description: "Aumenta la salud de la estructura un {X}%." , values: [5, 10, 15], effect: { stat: 'structure_health', is_percentage: true, scope: 'combat' } },
    'garrison_9': { name: "Reparaciones de Campo", maxLevels: 1, description: "La guarnición recupera un 1% de su salud cada 10 segundos en combate.", values: [1], effect: { stat: 'garrison_passive_heal', is_percentage: true, scope: 'combat' } },
    'garrison_10': { name: "Artillería Defensiva", maxLevels: 5, description: "Aumenta el ataque de las tropas a distancia de la guarnición un {X}%." , values: [3, 6, 9, 12, 15], effect: { stat: 'garrison_ranged_attack', is_percentage: true, scope: 'combat' } },
    'garrison_11': { name: "Último Bastión", maxLevels: 1, description: "El daño infligido por la guarnición aumenta un 10% si la estructura tiene <50% vida.", values: [10], effect: { stat: 'garrison_conditional_damage', is_percentage: true, scope: 'combat', condition: 'structure_health_low' } },
    'garrison_12': { name: "Campo de la Muerte", maxLevels: 1, description: "Inflige un 15% más de daño a atacantes con menos del 50% de su salud.", values: [15], effect: { stat: 'garrison_damage_vs_low_hp', is_percentage: true, scope: 'ataque' } },
    'garrison_13': { name: "Voluntad Inquebrantable", maxLevels: 3, description: "Reduce la pérdida de moral de la guarnición un {X}%." , values: [10, 20, 30], effect: { stat: 'garrison_morale_loss_reduction', is_percentage: true, scope: 'turno' } },
    'garrison_14': { name: "Contraataque Mortal", maxLevels: 5, description: "Aumenta aún más el daño de contraataque en {X}%." , values: [2, 4, 6, 8, 10], effect: { stat: 'garrison_counterattack_damage', is_percentage: true, scope: 'combat' } },
    'garrison_15': { name: "Llamada a las Armas", maxLevels: 1, description: "La primera vez que la guarnición es atacada, obtiene un escudo (Poder 500).", values: [500], effect: { stat: 'garrison_first_hit_shield', is_percentage: false, scope: 'combat' } },
    'garrison_16': { name: "Lealtad", maxLevels: 3, description: "Aumenta el Ataque y Defensa de la guarnición en {X}%." , values: [1, 2, 3], effect: { stat: 'garrison_multi_stat', is_percentage: true, scope: 'combat' } },
    'garrison_17': { name: "Línea Roja", maxLevels: 1, description: "Los enemigos no pueden huir del combate contra esta guarnición.", values: [1], effect: { stat: 'garrison_prevent_retreat', is_percentage: false, scope: 'combat' } },
    'garrison_18': { name: "Fortaleza Inexpugnable", maxLevels: 1, description: "Cuando la guarnición tiene menos del 50% de salud, su daño total aumenta un 30%." , values: [30], effect: { stat: 'garrison_conditional_damage', is_percentage: true, scope: 'combat', condition: 'structure_health_low' } },
// === 18 Talentos de nivel ===    
    'skill_1': { name: "Intelecto", maxLevels: 5, description: "Aumenta el Poder de Habilidad (daño/cura/escudo) un {X}%.", values: [2, 4, 6, 8, 10], effect: { stat: 'skill_power', is_percentage: true, scope: 'ataque' } },
    'skill_2': { name: "Reserva de Maná", maxLevels: 5, description: "Aumenta la Furia/Moral máxima en {X}.", values: [10, 20, 30, 40, 50], effect: { stat: 'max_rage', is_percentage: false, scope: 'turno' } },
    'skill_3': { name: "Iniciación", maxLevels: 3, description: "Otorga {X} de Furia/Moral al inicio del combate.", values: [50, 100, 150], effect: { stat: 'initial_rage', is_percentage: false, scope: 'ataque' } },
    'skill_4': { name: "Tácticas de Furia", maxLevels: 1, description: "Los ataques normales generan 9 de Furia/Moral extra.", values: [9], effect: { stat: 'rage_per_attack', is_percentage: false, scope: 'ataque' } },
    'skill_5': { name: "Furia Latente", maxLevels: 3, description: "Genera {X} de Furia/Moral por segundo en combate.", values: [1, 1.5, 2], effect: { stat: 'passive_rage_generation', is_percentage: false, scope: 'combat' } },
    'skill_6': { name: "Defensa Mágica", maxLevels: 3, description: "Reduce el daño de habilidad recibido un {X}%.", values: [2, 4, 6], effect: { stat: 'skill_damage_reduction', is_percentage: true, scope: 'combat' } },
    'skill_7': { name: "Voluntad Férrea", maxLevels: 1, description: "Las habilidades de esta división no pueden ser interrumpidas.", values: [1], effect: { stat: 'skill_uninterruptible', is_percentage: false, scope: 'ataque' } },
    'skill_8': { name: "Rejuvenecer", maxLevels: 1, description: "Tras usar una habilidad, recupera 150 de Furia/Moral instantáneamente.", values: [150], effect: { stat: 'rage_after_skill', is_percentage: false, scope: 'ataque' } },
    'skill_9': { name: "Bendición", maxLevels: 3, description: "Si la habilidad es de curación, su efecto aumenta un {X}%." , values: [10, 20, 30], effect: { stat: 'healing_effect', is_percentage: true, scope: 'ataque' } },
    'skill_10': { name: "Ataque Heráldico", maxLevels: 1, description: "Tras usar una habilidad, aumenta el Ataque un 10% por 3s.", values: [10], effect: { stat: 'attack_buff_after_skill', is_percentage: true, scope: 'ataque' } },
    'skill_11': { name: "Poder Arcano", maxLevels: 1, description: "Aumenta el daño de todas las fuentes un 3%.", values: [3], effect: { stat: 'all_damage', is_percentage: true, scope: 'combat' } },
    'skill_12': { name: "Golpe de Gracia", maxLevels: 1, description: "El daño de habilidad aumenta un 10% si el objetivo tiene menos del 50% de salud.", values: [10], effect: { stat: 'skill_damage_vs_low_hp', is_percentage: true, scope: 'ataque' } },
    'skill_13': { name: "Claridad", maxLevels: 5, description: "Aumenta aún más el Poder de Habilidad en {X}%." , values: [1, 2, 3, 4, 5], effect: { stat: 'skill_power', is_percentage: true, scope: 'ataque' } },
    'skill_14': { name: "Concentración", maxLevels: 1, description: "Aumenta el poder de la próxima habilidad un 15% (se consume al usar).", values: [15], effect: { stat: 'next_skill_buff', is_percentage: true, scope: 'ataque' } },
    'skill_15': { name: "Sifón de Maná", maxLevels: 1, description: "Los ataques de habilidad roban una pequeña cantidad de Furia/Moral al enemigo.", values: [50], effect: { stat: 'skill_rage_leech', is_percentage: false, scope: 'ataque' } },
    'skill_16': { name: "Sabiduría Táctica", maxLevels: 3, description: "Reduce el tiempo de reutilización de la habilidad en {X}%." , values: [5, 10, 15], effect: { stat: 'skill_cooldown_reduction', is_percentage: true, scope: 'ataque' } },
    'skill_17': { name: "Maestro de la Magia", maxLevels: 1, description: "Al usar una habilidad, probabilidad del 10% de que el coste sea 0.", values: [0], effect: { stat: 'free_skill_chance', is_percentage: false, scope: 'ataque', chance: 10 } },
    'skill_18': { name: "Cadena de Habilidades", maxLevels: 1, description: "Usar una habilidad tiene un 20% de probabilidad de que se active una segunda vez (50% de efectividad).", values: [50], effect: { stat: 'skill_chain_chance', is_percentage: true, scope: 'ataque', chance: 20 } },
};

const TREE_TEMPLATE = [
    { id: 1, position: { x: 0, y: 180 }, requires: null }, 
    { id: 2, position: { x: -60, y: 130 }, requires: 1 },
    { id: 3, position: { x: 60, y: 130 }, requires: 1 }, 
    { id: 4, position: { x: -120, y: 80 }, requires: 2 },
    { id: 5, position: { x: -60, y: 80 }, requires: 2 }, 
    { id: 6, position: { x: 60, y: 80 }, requires: 3 },
    { id: 7, position: { x: 120, y: 80 }, requires: 3 }, 
    { id: 8, position: { x: -180, y: 20 }, requires: 4 },
    { id: 9, position: { x: -90, y: 20 }, requires: [4, 5] }, 
    { id: 10, position: { x: 90, y: 20 }, requires: [6, 7] },
    { id: 11, position: { x: 180, y: 20 }, requires: 7 }, 
    { id: 12, position: { x: -180, y: -40 }, requires: 8 },
    { id: 13, position: { x: -90, y: -40 }, requires: 9 }, 
    { id: 14, position: { x: 90, y: -40 }, requires: 10 },
    { id: 15, position: { x: 180, y: -40 }, requires: 11 }, 
    { id: 16, position: { x: -45, y: -100 }, requires: 13 },
    { id: 17, position: { x: 45, y: -100 }, requires: 14 }, 
    { id: 18, position: { x: 0, y: -160 }, requires: [16, 17] }
];

function buildTree(talentIds) {
    const tree = { nodes: [] };
    if (talentIds.length !== 18) { console.error(`Error: Árbol debe tener 18 talentos, pero recibió ${talentIds.length}`); return tree; }
    TREE_TEMPLATE.forEach((templateNode, index) => {
        const newNode = (typeof structuredClone === 'function')
            ? structuredClone(templateNode)
            : JSON.parse(JSON.stringify(templateNode));
        newNode.talentId = talentIds[index];
        tree.nodes.push(newNode);
    });
    return tree;
}

const infantry_talents = ['inf_1','inf_2','inf_3','inf_4','inf_5','inf_6','inf_7','inf_8','inf_9','inf_10','inf_11','inf_12','inf_13','inf_14','inf_15','inf_16','inf_17','inf_18'];
const cavalry_talents = ['cav_1','cav_2','cav_3','cav_4','cav_5','cav_6','cav_7','cav_8','cav_9','cav_10','cav_11','cav_12','cav_13','cav_14','cav_15','cav_16','cav_17','cav_18'];
const archer_talents = ['arc_1','arc_2','arc_3','arc_4','arc_5','arc_6','arc_7','arc_8','arc_9','arc_10','arc_11','arc_12','arc_13','arc_14','arc_15','arc_16','arc_17','arc_18'];
const leadership_talents = ['lead_1','lead_2','lead_3','lead_4','lead_5','lead_6','lead_7','lead_8','lead_9','lead_10','lead_11','lead_12','lead_13','lead_14','lead_15','lead_16','lead_17','lead_18'];
const mobility_talents = ['mob_1','mob_2','mob_3','mob_4','mob_5','mob_6','mob_7','mob_8','mob_9','mob_10','mob_11','mob_12','mob_13','mob_14','mob_15','mob_16','mob_17','mob_18'];
const siege_talents = ['siege_1','siege_2','siege_3','siege_4','siege_5','siege_6','siege_7','siege_8','siege_9','siege_10','siege_11','siege_12','siege_13','siege_14','siege_15','siege_16','siege_17','siege_18'];
const garrison_talents = ['garrison_1','garrison_2','garrison_3','garrison_4','garrison_5','garrison_6','garrison_7','garrison_8','garrison_9','garrison_10','garrison_11','garrison_12','garrison_13','garrison_14','garrison_15','garrison_16','garrison_17','garrison_18'];
const skill_talents = ['skill_1','skill_2','skill_3','skill_4','skill_5','skill_6','skill_7','skill_8','skill_9','skill_10','skill_11','skill_12','skill_13','skill_14','skill_15','skill_16','skill_17','skill_18'];

const TALENT_TREES = {
    "Infantería": { icon: "⚔️", color: "#c0392b", tree: buildTree(infantry_talents) },
    "Caballería": { icon: "🐎", color: "#2980b9", tree: buildTree(cavalry_talents) },
    "Arqueros":   { icon: "🏹", color: "#27ae60", tree: buildTree(archer_talents) },
    "Liderazgo":  { icon: "👑", color: "#f1c40f", tree: buildTree(leadership_talents) },
    "Movilidad":  { icon: "👢", color: "#8e44ad", tree: buildTree(mobility_talents) },
    "Asedio":     { icon: "💣", color: "#e67e22", tree: buildTree(siege_talents) },
    "Guarnición": { icon: "🏰", color: "#7f8c8d", tree: buildTree(garrison_talents) },
    "Habilidad":  { icon: "⭐", color: "#1abc9c", tree: buildTree(skill_talents) }
};
