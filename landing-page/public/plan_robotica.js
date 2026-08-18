// Ingeniería en Robótica — Plan 323-0
// Sin pdfLinks: los programas analíticos publicados por la UAGRM corresponden al patrón
// -18-1 (revisiones 2006-2014), anterior a este plan. El renderer omite el botón cuando falta.
//
// Prerrequisitos: la malla oficial es un diagrama de flujo sin tabla de pre-requisitos, y sus
// flechas cruzan en diagonal de forma no legible a la resolución disponible. Solo se codifican
// las relaciones inequívocas (cadenas estándar compartidas con las otras 3 carreras y pares
// I → II). El resto queda vacío hasta conseguir la tabla oficial.

// Data exported globally for other scripts to use
window.planData = [
    { "sigla": "MAT101", "nombre_materia": "CÁLCULO I", "prerequisitos": "", "nivel": "1er. SEMESTRE" },
    { "sigla": "FIS100", "nombre_materia": "FÍSICA I", "prerequisitos": "", "nivel": "1er. SEMESTRE" },
    { "sigla": "INF110", "nombre_materia": "INTRODUCCIÓN A LA PROGRAMACIÓN", "prerequisitos": "", "nivel": "1er. SEMESTRE" },
    { "sigla": "ROB101", "nombre_materia": "INTRODUCCIÓN A LA ROBÓTICA", "prerequisitos": "", "nivel": "1er. SEMESTRE" },
    { "sigla": "ROB102", "nombre_materia": "DIBUJO MECÁNICO EN CAD", "prerequisitos": "", "nivel": "1er. SEMESTRE" },
    { "sigla": "MET100", "nombre_materia": "METODOLOGÍA DE LA INVESTIGACIÓN", "prerequisitos": "", "nivel": "1er. SEMESTRE" },

    { "sigla": "MAT102", "nombre_materia": "CÁLCULO II", "prerequisitos": "MAT101|", "nivel": "2do. SEMESTRE" },
    { "sigla": "FIS120", "nombre_materia": "FÍSICA II", "prerequisitos": "FIS100|", "nivel": "2do. SEMESTRE" },
    { "sigla": "INF120", "nombre_materia": "PROGRAMACIÓN I", "prerequisitos": "INF110|", "nivel": "2do. SEMESTRE" },
    { "sigla": "ROB103", "nombre_materia": "ESTÁTICA", "prerequisitos": "", "nivel": "2do. SEMESTRE" },
    { "sigla": "MAT202", "nombre_materia": "PROBABILIDADES Y ESTADÍSTICAS I", "prerequisitos": "", "nivel": "2do. SEMESTRE" },
    { "sigla": "ROB104", "nombre_materia": "PENSAMIENTO CRÍTICO Y CREATIVO", "prerequisitos": "", "nivel": "2do. SEMESTRE" },

    { "sigla": "MAT207", "nombre_materia": "ECUACIONES DIFERENCIALES", "prerequisitos": "MAT102|", "nivel": "3er. SEMESTRE" },
    { "sigla": "ROB201", "nombre_materia": "ELECTRICIDAD Y MAGNETISMO", "prerequisitos": "FIS120|", "nivel": "3er. SEMESTRE" },
    { "sigla": "RDS210", "nombre_materia": "ANÁLISIS DE CIRCUITOS", "prerequisitos": "FIS120|", "nivel": "3er. SEMESTRE" },
    { "sigla": "ROB203", "nombre_materia": "DINÁMICA", "prerequisitos": "ROB103|", "nivel": "3er. SEMESTRE" },
    { "sigla": "ROB202", "nombre_materia": "TECNOLOGÍAS DE LA MANUFACTURA", "prerequisitos": "", "nivel": "3er. SEMESTRE" },
    { "sigla": "MAT103", "nombre_materia": "ÁLGEBRA LINEAL", "prerequisitos": "", "nivel": "3er. SEMESTRE" },

    { "sigla": "MAT205", "nombre_materia": "MÉTODOS NUMÉRICOS", "prerequisitos": "MAT207|", "nivel": "4to. SEMESTRE" },
    { "sigla": "RDS220", "nombre_materia": "CIRCUITOS ELECTRÓNICOS I", "prerequisitos": "RDS210|", "nivel": "4to. SEMESTRE" },
    { "sigla": "INF220", "nombre_materia": "ESTRUCTURA DE DATOS", "prerequisitos": "", "nivel": "4to. SEMESTRE" },
    { "sigla": "ELT352", "nombre_materia": "CIRCUITOS DIGITALES", "prerequisitos": "", "nivel": "4to. SEMESTRE" },
    { "sigla": "INF433", "nombre_materia": "REDES I", "prerequisitos": "", "nivel": "4to. SEMESTRE" },
    { "sigla": "ELT354", "nombre_materia": "SEÑALES Y SISTEMAS", "prerequisitos": "MAT207|", "nivel": "4to. SEMESTRE" },

    { "sigla": "INF418", "nombre_materia": "INTELIGENCIA ARTIFICIAL", "prerequisitos": "", "nivel": "5to. SEMESTRE" },
    { "sigla": "ROB309", "nombre_materia": "CIRCUITOS ELECTRÓNICOS II", "prerequisitos": "RDS220|", "nivel": "5to. SEMESTRE" },
    { "sigla": "ROB303", "nombre_materia": "SISTEMAS EMBEBIDOS", "prerequisitos": "", "nivel": "5to. SEMESTRE" },
    { "sigla": "ROB301", "nombre_materia": "SISTEMAS DE CONTROL I", "prerequisitos": "", "nivel": "5to. SEMESTRE" },
    { "sigla": "ROB302", "nombre_materia": "ACTUADORES Y SENSORES", "prerequisitos": "", "nivel": "5to. SEMESTRE" },
    { "sigla": "RDS320", "nombre_materia": "PROCESAMIENTO DIGITAL DE SEÑALES", "prerequisitos": "ELT354|", "nivel": "5to. SEMESTRE" },

    { "sigla": "ROB307", "nombre_materia": "VISIÓN COMPUTACIONAL", "prerequisitos": "", "nivel": "6to. SEMESTRE" },
    { "sigla": "ROB304", "nombre_materia": "ROBÓTICA INDUSTRIAL", "prerequisitos": "", "nivel": "6to. SEMESTRE" },
    { "sigla": "ROB306", "nombre_materia": "INTERNET DE LAS COSAS", "prerequisitos": "", "nivel": "6to. SEMESTRE" },
    { "sigla": "ROB305", "nombre_materia": "TALLER DE CONTROL", "prerequisitos": "", "nivel": "6to. SEMESTRE" },
    { "sigla": "ROB308", "nombre_materia": "INSTRUMENTACIÓN INDUSTRIAL", "prerequisitos": "", "nivel": "6to. SEMESTRE" },
    { "sigla": "MET200", "nombre_materia": "LIDERAZGO, EMPRENDIMIENTO Y STARTUPS", "prerequisitos": "", "nivel": "6to. SEMESTRE" },

    { "sigla": "ROB405", "nombre_materia": "INTERACCIÓN HUMANO - ROBOT", "prerequisitos": "", "nivel": "7mo. SEMESTRE" },
    { "sigla": "ROB401", "nombre_materia": "ROBÓTICA AVANZADA", "prerequisitos": "", "nivel": "7mo. SEMESTRE" },
    { "sigla": "ROB404", "nombre_materia": "ROBOT OPERATING SYSTEM", "prerequisitos": "", "nivel": "7mo. SEMESTRE" },
    { "sigla": "ROB403", "nombre_materia": "SISTEMAS DE CONTROL II", "prerequisitos": "ROB301|", "nivel": "7mo. SEMESTRE" },
    { "sigla": "ROB402", "nombre_materia": "AUTOMATIZACIÓN Y CONTROL", "prerequisitos": "", "nivel": "7mo. SEMESTRE" },
    { "sigla": "", "nombre_materia": "ELECTIVA", "prerequisitos": "", "nivel": "7mo. SEMESTRE" },

    { "sigla": "INF511", "nombre_materia": "TALLER DE GRADO I", "prerequisitos": "", "nivel": "8vo. SEMESTRE" },
    { "sigla": "ROB406", "nombre_materia": "TALLER DE ROBÓTICA Y SISTEMAS INTELIGENTES", "prerequisitos": "", "nivel": "8vo. SEMESTRE" },
    { "sigla": "ECO449", "nombre_materia": "PREPARACIÓN Y EVALUACIÓN DE PROYECTOS", "prerequisitos": "", "nivel": "8vo. SEMESTRE" },
    { "sigla": "PRA001", "nombre_materia": "PRÁCTICA PROFESIONAL", "prerequisitos": "", "nivel": "8vo. SEMESTRE" },
    { "sigla": "", "nombre_materia": "ELECTIVA", "prerequisitos": "", "nivel": "8vo. SEMESTRE" },

    { "sigla": "GRL001", "nombre_materia": "MODALIDAD DE TITULACIÓN LICENCIATURA", "prerequisitos": "INF511|ROB406|ECO449|PRA001|", "nivel": "9no. SEMESTRE" }
];
