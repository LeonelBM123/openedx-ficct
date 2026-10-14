(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Studio = window.IAAssistant.Studio || {};

  var MODE_UNIT = "unit";
  var MODE_CREATE = "create";
  var MODE_EDIT = "edit";
  var MODE_IDLE = "idle";

  function normalizeText(value) {
    var text = value || "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function includesAny(text, phrases) {
    return phrases.some(function (phrase) {
      return text.indexOf(phrase) >= 0;
    });
  }

  function includesWord(text, words) {
    return words.some(function (word) {
      var regex = new RegExp("\\b" + word + "\\b", "i");
      return regex.test(text);
    });
  }

  function detectComponentType(normalizedText) {
    var types = [
      {
        type: "pregunta_abierta",
        strong: ["pregunta abierta", "respuesta abierta", "desarrollo", "reflexion", "rubrica"],
        weak: ["pregunta", "preguntas"]
      },
      {
        type: "quiz_multiple",
        strong: ["quiz", "opcion multiple", "seleccion multiple", "test"],
        weak: ["cuestionario", "cuestionarios"]
      },
      {
        type: "codigo",
        strong: ["codigo", "java", "python", "javascript", "typescript", "c++", "c#", "php", "html", "css", "programas"],
        weak: ["programacion", "algoritmo", "algoritmos", "ejercicio", "practica"]
      },
      {
        type: "teoria",
        strong: ["teoria", "teorico", "teorica", "contenido teorico"],
        weak: ["explicacion", "explicaciones", "concepto", "conceptos", "lectura", "contenido", "contenidos"]
      }
    ];

    var bestType = "";
    var bestIndex = Infinity;
    var bestWeight = 0;

    types.forEach(function (t) {
      // Probar fuertes (peso 2)
      t.strong.forEach(function (phrase) {
        var idx = normalizedText.indexOf(phrase);
        if (idx >= 0) {
          if (2.0 > bestWeight || (2.0 === bestWeight && idx < bestIndex)) {
            bestWeight = 2.0;
            bestIndex = idx;
            bestType = t.type;
          }
        }
      });

      // Probar débiles (peso 1)
      t.weak.forEach(function (phrase) {
        var idx = normalizedText.indexOf(phrase);
        if (idx >= 0) {
          if (1.0 > bestWeight || (1.0 === bestWeight && idx < bestIndex)) {
            bestWeight = 1.0;
            bestIndex = idx;
            bestType = t.type;
          }
        }
      });
    });

    return {
      type: bestType,
      weight: bestWeight
    };
  }

  window.IAAssistant.Studio.ChatbarIntentDetector = {
    detect: function (prompt, options) {
      var opts = options || {};
      var activeComponent = opts.activeComponent || null;
      var text = normalizeText(prompt);

      if (!text) {
        return {
          mode: MODE_IDLE,
          componentType: "",
          confidence: "low",
          scores: { unit: 0, create: 0, edit: 0 },
          reason: "El prompt está vacío."
        };
      }

      var typeResult = detectComponentType(text);
      var componentType = typeResult.type;
      var bestWeight = typeResult.weight;

      var unitScore = 0;
      var createScore = 0;
      var editScore = 0;

      // 1. EVALUACIÓN DE UNIDAD (MODE_UNIT)
      var strongUnitPhrases = [
        "genera una unidad",
        "genera unidad",
        "generar unidad",
        "generar una unidad",
        "genera un tema",
        "genera tema",
        "generar un tema",
        "generar tema",
        "crea una unidad",
        "crea unidad",
        "crear unidad",
        "crear una unidad",
        "crea un tema",
        "crea tema",
        "crear un tema",
        "crear tema",
        "prepara una clase",
        "prepara clase",
        "preparar clase",
        "preparar una clase",
        "prepara un tema",
        "prepara tema",
        "preparar un tema",
        "preparar tema",
        "haz una leccion",
        "haz leccion",
        "hacer leccion",
        "hacer una leccion",
        "haz una clase",
        "hacer una clase",
        "haz un tema",
        "hacer un tema",
        "crea un modulo",
        "crea modulo",
        "crear modulo",
        "crear un modulo",
        "genera una unidad completa",
        "genera unidad completa",
        "crea un tema completo",
        "crear tema completo",
        "prepara una clase completa",
        "preparar clase completa",
        "desarrolla un tema",
        "desarrollar un tema",
        "desarrolla tema",
        "desarrollar tema",
        "desarrolla una clase",
        "desarrollar una clase",
        "desarrolla un modulo",
        "desarrollar un modulo",
        "desarrolla un curso",
        "desarrollar un curso",
        "crea un curso",
        "crear un curso",
        "genera un curso",
        "generar un curso",
        "aborda el tema",
        "abordar el tema",
        "abordando el tema",
        "tema sobre",
        "tema abordando",
        "unidad sobre",
        "clase sobre",
        "leccion sobre",
        "modulo sobre"
      ];
      var hasStrongUnitPhrase = includesAny(text, strongUnitPhrases);
      if (hasStrongUnitPhrase) {
        unitScore += 10.0;
      }

      if (
        includesAny(text, [
          "unidad completa",
          "tema completo",
          "clase completa",
          "modulo completo",
          "curso completo"
        ])
      ) {
        unitScore += 5.0;
      }

      var unitNouns = ["unidad", "tema", "clase", "leccion", "modulo", "curso"];
      if (includesAny(text, unitNouns)) {
        unitScore += 2.0;
      }

      var creationVerbs = ["crea", "crear", "genera", "generar", "prepara", "preparar", "haz", "hacer", "desarrolla", "desarrollar"];
      var hasUnitVerb = includesAny(text, creationVerbs);
      var hasUnitNoun = includesAny(text, unitNouns);
      if (hasUnitVerb && hasUnitNoun) {
        unitScore += 2.5;
      }

      var componentKeywords = [
        "teoria", "teorico", "explicacion", "lectura", "concepto", 
        "quiz", "cuestionario", "test", "pregunta", "desarrollo", 
        "reflexion", "codigo", "programacion", "ejercicio"
      ];
      var componentCount = 0;
      componentKeywords.forEach(function (word) {
        if (text.indexOf(word) >= 0) {
          componentCount++;
        }
      });
      if (componentCount >= 2 && includesAny(text, ["con ", "incluyendo ", "incluye ", "que incluya ", "y ", "para complementar", "para ", "con un ", "con una "])) {
        unitScore += 5.0;
      }

      // 2. EVALUACIÓN DE CREACIÓN (MODE_CREATE)
      var strongCompPhrases = [
        "crea un componente",
        "crea una teoria",
        "crea un ejercicio",
        "crea un quiz",
        "crea un cuestionario",
        "crea una pregunta",
        "crea una lectura",
        "crea un concepto",
        "crea una explicacion",
        "crea una explicacion corta",
        "agrega un componente",
        "agrega un quiz",
        "agrega un cuestionario",
        "agrega otro cuestionario",
        "agrega otro quiz",
        "agrega una practica",
        "anade un componente",
        "anade una pregunta abierta",
        "anade una teoria",
        "anade un quiz",
        "añade un componente",
        "añade una pregunta abierta",
        "añade una teoria",
        "añade un quiz",
        "haz un ejercicio de codigo",
        "crea una actividad de programacion",
        "crea un quiz separado",
        "agrega un quiz separado"
      ];
      var hasStrongComponentPhrase = includesAny(text, strongCompPhrases);
      if (hasStrongComponentPhrase) {
        createScore += 5.0;
      }

      var addVerbs = ["crea", "crear", "genera", "generar", "agrega", "agregar", "anade", "añade", "anadir", "añadir", "haz", "hacer", "inserta", "insertar"];
      var hasCreateVerb = includesAny(text, addVerbs);
      if (hasCreateVerb) {
        createScore += 1.5;
      }

      var compNouns = ["componente", "actividad", "ejercicio", "cuestionario", "pregunta"];
      if (includesAny(text, compNouns)) {
        createScore += 1.5;
      }

      if (componentType) {
        createScore += 2.0;
      }

      // 3. EVALUACIÓN DE EDICIÓN (MODE_EDIT)
      var strongEditPhrases = [
        "mejora este componente",
        "mejora el componente",
        "corrige la ortografia",
        "agrega feedbacks",
        "agregar feedbacks",
        "ajusta la rubrica",
        "modifica el componente seleccionado",
        "mejora esta teoria",
        "reescribe este quiz",
        "hazlo mas claro",
        "hacerlo mas claro",
        "hazlo mas",
        "hazla mas",
        "hacerlo mas",
        "hacerla mas"
      ];
      var hasStrongEditPhrase = includesAny(text, strongEditPhrases);
      if (hasStrongEditPhrase) {
        editScore += 5.0;
      }

      var editVerbs = ["edita", "editar", "mejora", "mejorar", "corrige", "corregir", "reescribe", "reescribir", "ajusta", "ajustar", "modifica", "modificar", "cambia", "cambiar", "reformula", "reformular", "pule", "pulir", "actualiza", "actualizar", "hazlo mas claro", "hacerlo mas claro", "amplia", "ampliar", "resume", "resumir", "complementa", "complementar", "enriquece", "enriquecer", "enriquecer este", "enriquece este", "expande", "expandir", "optimiza", "optimizar", "simplifica", "simplificar", "profundiza", "profundizar", "hazlo", "hazla", "hacerlo", "hacerla"];
      var hasEditVerb = includesAny(text, editVerbs);
      if (hasEditVerb) {
        editScore += 3.0;
      }

      var deictics = ["este", "esta", "esto", "actual", "seleccionado", "abierto"];
      var hasDeictic = includesWord(text, deictics);
      if (hasDeictic) {
        editScore += 1.5;
      }

      var editTargets = ["feedback", "feedbacks", "rubrica", "ortografia", "redaccion", "explicacion", "retroalimentacion", "retroalimentaciones"];
      if (includesAny(text, editTargets)) {
        editScore += 1.5;
      }

      // Lógica contextual para redirección deíctica
      var refersToComponent = componentType || includesAny(text, compNouns);
      var isDeicticEdit = hasDeictic && refersToComponent;
      if (isDeicticEdit) {
        editScore += 5.0;
        hasEditVerb = true;
      }

      // Validar presencia de verbos o frases fuertes para evitar falsos positivos
      if (!hasStrongUnitPhrase && !hasUnitVerb) {
        unitScore = 0;
      }
      if (!hasStrongComponentPhrase && !hasCreateVerb) {
        createScore = 0;
      }
      if (!hasStrongEditPhrase && !hasEditVerb) {
        editScore = 0;
      }

      // RESOLUCIÓN DE INTENTOS
      var mode = MODE_IDLE;
      var confidence = "high";
      var reason = "";

      var maxScore = Math.max(unitScore, createScore, editScore);

      if (maxScore === 0) {
        return {
          mode: MODE_IDLE,
          componentType: "",
          confidence: "low",
          scores: { unit: 0, create: 0, edit: 0 },
          reason: "No se detectaron suficientes indicadores de intención."
        };
      }

      if (maxScore === unitScore) {
        mode = MODE_UNIT;
        reason = "Se detectó intención de generar o preparar una unidad completa.";
      } else if (maxScore === createScore) {
        mode = MODE_CREATE;
        reason = "Se detectó intención de agregar o crear un componente.";
      } else {
        mode = MODE_EDIT;
        reason = "Se detectó intención de modificar o editar un componente.";
      }

      // Evitar falsos positivos débiles (forzar idle si las puntuaciones no son consistentes)
      if (mode === MODE_UNIT && !hasStrongUnitPhrase && unitScore < 4.0) {
        mode = MODE_IDLE;
      }
      if (mode === MODE_CREATE && !hasStrongComponentPhrase && (createScore < 3.5 || bestWeight === 1.0)) {
        mode = MODE_IDLE;
      }

      // Determinar la confianza
      var scoresArray = [unitScore, createScore, editScore];
      scoresArray.sort(function (a, b) {
        return b - a;
      });
      var firstScore = scoresArray[0];
      var secondScore = scoresArray[1];
      var diff = firstScore - secondScore;

      if (firstScore < 2.0) {
        confidence = "low";
      } else if (diff < 1.2) {
        confidence = "ambiguous";
      }

      // Limpiar el tipo de componente si no estamos en creación
      if (mode !== MODE_CREATE) {
        componentType = "";
      }

      // Validaciones de condiciones específicas
      if (mode === MODE_UNIT) {
        if (hasStrongUnitPhrase) {
          if (hasStrongComponentPhrase) {
            confidence = "ambiguous";
            reason = "Se detectó intención de generar una unidad completa pero también una acción directa para crear un componente individual.";
          } else {
            confidence = "high";
            reason = "Se detectó intención clara de generar una unidad completa.";
          }
        }
      }

      if (mode === MODE_EDIT) {
        if (hasStrongEditPhrase) {
          if (hasStrongComponentPhrase) {
            confidence = "ambiguous";
          } else {
            confidence = "high";
          }
        }
        if (!activeComponent) {
          if (!hasStrongEditPhrase) {
            mode = MODE_IDLE;
            confidence = "low";
            reason = "Se detectó intención de edición pero no hay un componente activo seleccionado.";
          } else {
            confidence = "low";
            reason = "Se detectó intención de edición, pero falta un componente activo seleccionado para aplicar los cambios.";
          }
        }
      }

      if (mode === MODE_CREATE && !componentType) {
        confidence = "ambiguous";
        reason = "Se detectó intención de creación de componente, pero no se especificó un tipo válido (teoría, quiz, abierta, código).";
      }

      return {
        mode: mode,
        componentType: componentType,
        confidence: confidence,
        scores: {
          unit: parseFloat(unitScore.toFixed(2)),
          create: parseFloat(createScore.toFixed(2)),
          edit: parseFloat(editScore.toFixed(2))
        },
        reason: reason
      };
    }
  };
})();
