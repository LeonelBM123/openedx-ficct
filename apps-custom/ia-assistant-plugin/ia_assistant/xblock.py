import json
import hashlib
from datetime import datetime, timezone
from numbers import Number

from xblock.core import XBlock
from xblock.fields import Dict, Float, Integer, List, Scope, String
from web_fragments.fragment import Fragment

from .services.ai_errors import AIError, ai_error_to_payload
from .resources_manifest import (
    STUDIO_CSS_URL_PATHS,
    STUDIO_CSS_PATHS,
    STUDIO_HTML_PATH,
    STUDIO_JS_PATHS,
    STUDIO_JS_URL_PATHS,
    STUDENT_CSS_PATHS,
    STUDENT_HTML_PATH,
    STUDENT_JS_PATHS,
)
from .schema import COMPONENT_TYPES, UNIT_SCHEMA_VERSION, get_default_unit
from .utils.resources import read_static_text
from .validators import validate_and_normalize_studio_unit


class IAAssistantXBlock(XBlock):
    """
    IA Assistant XBlock.

    Version minima inicial para validar que el plugin instala correctamente,
    puede ser importado por el SDK y expone vistas separadas para Studio y
    Student sin implementar todavia la interfaz final.
    """

    has_score = True

    display_name = String(
        default="IA Assistant",
        scope=Scope.settings,
        help="Nombre visible del bloque en Open edX.",
    )

    prompt_docente = String(
        default="",
        scope=Scope.content,
        help="Prompt escrito por el docente para generar la unidad.",
    )

    unidad_json = String(
        default="{}",
        scope=Scope.content,
        help="JSON final de la unidad.",
    )

    student_answers = Dict(
        default={},
        scope=Scope.user_state,
        help="Respuestas guardadas por el alumno para esta unidad.",
    )

    student_review_result = Dict(
        default={},
        scope=Scope.user_state,
        help="Resultado de revisión IA por alumno.",
    )

    weight = Float(
        display_name="Peso",
        default=None,
        scope=Scope.settings,
        help=(
            "Puntaje con el que esta unidad cuenta en el curso. Si se deja "
            "vacio, se usa el puntaje maximo de la unidad."
        ),
    )

    max_attempts = Integer(
        display_name="Maximo de intentos",
        default=None,
        scope=Scope.settings,
        help=(
            "Cantidad maxima de revisiones IA por alumno. Vacio = sin limite."
        ),
    )

    # El nombre `attempts` es el que usa el Instructor Dashboard (Student Admin >
    # Reset Attempts) para reiniciar el contador de un alumno.
    attempts = Integer(
        default=0,
        scope=Scope.user_state,
        help="Revisiones IA exitosas que el alumno ya consumio.",
    )

    student_review_history = List(
        default=[],
        scope=Scope.user_state,
        help="Historial acotado de revisiones IA y notas publicadas por alumno.",
    )

    sdk_view_mode = String(
        default="student",
        scope=Scope.settings,
        help=(
            "Solo para pruebas en XBlock SDK. "
            "Valores permitidos: student, studio."
        ),
    )

    def student_view(self, context=None):
        """
        Renderiza la vista minima para LMS/alumno.

        En XBlock SDK, el escenario Studio usa sdk_view_mode='studio'
        porque Workbench renderiza student_view por defecto.
        """

        # TEMPORAL SDK TEST:
        # Forzar vista Student usando la misma instancia del escenario Studio.
        if self._is_sdk_studio_mode():
            return self.studio_view(context)

        initial_unit, load_warning = self._get_initial_unit()
        fragment = Fragment(read_static_text(STUDENT_HTML_PATH))
        self._add_css_resources(fragment, STUDENT_CSS_PATHS)
        self._add_js_resources(fragment, STUDENT_JS_PATHS)
        fragment.initialize_js(
            "IAAssistantStudent",
            {
                "initial_unit": initial_unit,
                "initial_student_answers": (
                    self.student_answers
                    if isinstance(self.student_answers, dict)
                    else {}
                ),
                "initial_student_review_result": (
                    self.student_review_result
                    if isinstance(self.student_review_result, dict)
                    else {}
                ),
                "load_warning": load_warning,
                "attempts": self.attempts or 0,
                "max_attempts": self.max_attempts,
            },
        )
        return fragment

    def author_view(self, context=None):
        """
        Vista de Studio (pagina de unidad). Si el docente aun no configuro la
        unidad muestra un estado vacio claro; si ya la configuro muestra la
        misma vista que ve el alumno, sin depender de que student_view se
        comporte distinto en Studio.
        """
        initial_unit, load_warning = self._get_initial_unit()
        has_components = bool(
            isinstance(initial_unit, dict)
            and initial_unit.get("componentes")
        )

        if not has_components:
            html = (
                '<div class="ia-assistant-author-empty">'
                '<h3>IA Assistant</h3>'
                '<p>Esta unidad aun no esta configurada. '
                'Usa el boton <strong>Editar</strong> de este componente '
                'para crear su contenido.</p>'
                '</div>'
            )
            return Fragment(html)

        return self.student_view(context)

    def max_score(self):
        """
        Puntaje maximo de la unidad: suma de `puntaje` de los componentes
        calificables. None si el docente no definio puntajes.
        """
        unit, _warning = self._get_initial_unit()
        components = unit.get("componentes") if isinstance(unit, dict) else None
        total = 0

        for component in components or []:
            if not isinstance(component, dict):
                continue
            if component.get("tipo") not in (
                "pregunta_abierta",
                "codigo",
                "quiz_multiple",
            ):
                continue
            puntaje = component.get("puntaje")
            if isinstance(puntaje, int) and not isinstance(puntaje, bool):
                total += max(puntaje, 0)

        return total or None

    def studio_view(self, context=None):
        """
        Renderiza la vista minima para Studio/docente.
        """
        initial_unit, load_warning = self._get_initial_unit()
        initialize_data = {
            "initial_unit": initial_unit,
            "load_warning": load_warning,
            "weight": self.weight,
            "max_attempts": self.max_attempts,
        }
        fragment = Fragment(read_static_text(STUDIO_HTML_PATH))
        self._add_css_url_resources(fragment, STUDIO_CSS_URL_PATHS)
        self._add_css_resources(fragment, STUDIO_CSS_PATHS)
        self._add_js_url_resources(fragment, STUDIO_JS_URL_PATHS)
        self._add_js_resources(fragment, STUDIO_JS_PATHS)
        initialize_data["generate_teacher_unit_url"] = self._handler_url(
            "generate_teacher_unit"
        )
        initialize_data["generate_teacher_component_create_url"] = (
            self._handler_url("generate_teacher_component_create")
        )
        initialize_data["generate_teacher_component_edit_url"] = (
            self._handler_url("generate_teacher_component_edit")
        )
        fragment.initialize_js(
            "IAAssistantStudio",
            initialize_data,
        )
        return fragment

    def _is_sdk_studio_mode(self):
        """
        Indica si el escenario del SDK debe mostrar la vista Studio.
        """
        return str(self.sdk_view_mode).strip().lower() == "studio"

    def _get_initial_unit(self):
        """
        Devuelve una unidad inicial segura para hidratar Studio.
        """
        raw_unit = self.unidad_json

        if not raw_unit or str(raw_unit).strip() in ("", "{}"):
            return get_default_unit(), ""

        try:
            unit = json.loads(raw_unit)
        except (TypeError, ValueError):
            return (
                get_default_unit(),
                "No se pudo cargar la unidad guardada. Se inicio una unidad vacia.",
            )

        if not self._is_valid_unit(unit):
            return (
                get_default_unit(),
                "La unidad guardada no tiene un formato valido. Se inicio una unidad vacia.",
            )

        return unit, ""

    @staticmethod
    def _is_non_empty_string(value):
        return isinstance(value, str) and bool(value.strip())

    @classmethod
    def _is_valid_unit(cls, unit):
        """
        Valida la estructura minima persistible de una unidad.
        """
        if not isinstance(unit, dict):
            return False

        if unit.get("version") != UNIT_SCHEMA_VERSION:
            return False

        if not isinstance(unit.get("titulo"), str):
            return False

        components = unit.get("componentes")

        if not isinstance(components, list):
            return False

        for component in components:
            if not cls._is_valid_component(component):
                return False

        return True

    @classmethod
    def _is_valid_component(cls, component):
        if not isinstance(component, dict):
            return False

        component_type = component.get("tipo")
        component_data = component.get("data")

        if not cls._is_non_empty_string(component.get("id")):
            return False

        if not cls._is_non_empty_string(component_type):
            return False

        if component_type not in COMPONENT_TYPES:
            return False

        if not isinstance(component.get("nombre"), str):
            return False

        if not isinstance(component_data, dict):
            return False

        if (
            component_type == "teoria"
            and component_data.get("formato") != "markdown"
        ):
            return False

        return True

    @staticmethod
    def _add_css_resources(fragment, resource_paths):
        """
        Agrega recursos CSS al fragmento en el orden recibido.
        """
        for resource_path in resource_paths:
            fragment.add_css(read_static_text(resource_path))

    def _add_css_url_resources(self, fragment, resource_pairs):
        """
        Agrega recursos CSS servidos por URL local del runtime.
        """
        for resource_uri, fallback_resource_path in resource_pairs:
            resource_url = ""

            if hasattr(self.runtime, "local_resource_url"):
                try:
                    resource_url = self.runtime.local_resource_url(
                        self,
                        resource_uri,
                    ) or ""
                except NotImplementedError:
                    resource_url = ""

            if resource_url:
                fragment.add_css_url(resource_url)
                continue

            fragment.add_css(read_static_text(fallback_resource_path))

    @staticmethod
    def _add_js_resources(fragment, resource_paths):
        """
        Agrega recursos JavaScript al fragmento en el orden recibido.
        """
        for resource_path in resource_paths:
            fragment.add_javascript(read_static_text(resource_path))

    def _add_js_url_resources(self, fragment, resource_pairs):
        """
        Agrega recursos JavaScript servidos por URL local del runtime.
        """
        for resource_uri, fallback_resource_path in resource_pairs:
            resource_url = ""

            if hasattr(self.runtime, "local_resource_url"):
                try:
                    resource_url = self.runtime.local_resource_url(
                        self,
                        resource_uri,
                    ) or ""
                except NotImplementedError:
                    resource_url = ""

            if resource_url:
                fragment.add_javascript_url(resource_url)
                continue

            fragment.add_javascript(read_static_text(fallback_resource_path))

    @staticmethod
    def _extract_handler_payload(data):
        if isinstance(data, dict):
            return data

        return {}

    def _handler_url(self, handler_name):
        if not hasattr(self, "runtime") or not self.runtime:
            return ""

        if hasattr(self.runtime, "handler_url"):
            return self.runtime.handler_url(self, handler_name)

        if not hasattr(self.runtime, "handlerUrl"):
            return ""

        return self.runtime.handlerUrl(self, handler_name)

    @staticmethod
    def _build_context_payload(payload, preferred_key="contexto"):
        contexto = payload.get(preferred_key)

        if isinstance(contexto, dict):
            return contexto

        fallback_key = (
            "unit_context" if preferred_key == "contexto" else "contexto"
        )
        contexto = payload.get(fallback_key)

        if isinstance(contexto, dict):
            return contexto

        return {}

    @staticmethod
    def _build_answers_signature_payload(answers):
        if not isinstance(answers, dict):
            return ""

        normalized = {}

        for component_id in sorted(answers.keys()):
            answer = answers.get(component_id)
            if not isinstance(answer, dict):
                continue

            component_type = str(answer.get("tipo") or "")
            value = answer.get("value")

            if component_type == "quiz_multiple":
                if isinstance(value, list):
                    normalized_value = sorted([str(item) for item in value])
                elif value in (None, ""):
                    normalized_value = []
                else:
                    normalized_value = [str(value)]
            elif value is None:
                normalized_value = ""
            else:
                normalized_value = str(value)

            normalized[str(component_id)] = {
                "tipo": component_type,
                "value": normalized_value,
            }

        return json.dumps(
            normalized,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

    @classmethod
    def _build_answers_signature(cls, answers):
        payload = cls._build_answers_signature_payload(answers)

        if not payload:
            return ""

        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def _is_valid_grade_number(value):
        return isinstance(value, Number) and not isinstance(value, bool)

    def _publish_grade_from_review(self, review):
        if not isinstance(review, dict):
            return None

        review_meta = review.get("_ia_assistant")
        if not isinstance(review_meta, dict):
            review_meta = {}
            review["_ia_assistant"] = review_meta

        review_meta.pop("grade_publish_error", None)
        review_meta["grade_published"] = False

        value = review.get("puntaje_total_obtenido")
        max_value = review.get("puntaje_total_maximo")

        if (
            not self._is_valid_grade_number(value)
            or not self._is_valid_grade_number(max_value)
            or max_value <= 0
            or value < 0
            or value > max_value
        ):
            return None

        review_meta["grade_value"] = value
        review_meta["grade_max_value"] = max_value

        try:
            self.runtime.publish(
                self,
                "grade",
                {
                    "value": value,
                    "max_value": max_value,
                },
            )
        except Exception as error:
            review_meta["grade_publish_error"] = (
                str(error).strip()
                or "No se pudo publicar la calificacion oficial."
            )
            return (
                "La revision se genero correctamente, pero no se pudo "
                "publicar la calificacion oficial."
            )

        review_meta["grade_published"] = True
        return None

    MAX_REVIEW_HISTORY = 20

    def _append_review_history(self, review):
        """Guarda un registro acotado de cada revision para auditoria."""
        if not isinstance(review, dict):
            return

        meta = review.get("_ia_assistant")
        meta = meta if isinstance(meta, dict) else {}

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "value": meta.get("grade_value"),
            "max_value": meta.get("grade_max_value"),
            "grade_published": bool(meta.get("grade_published")),
            "grade_publish_error": meta.get("grade_publish_error", ""),
            "answers_signature": meta.get("answers_signature", ""),
        }

        history = list(self.student_review_history or [])
        history.append(entry)
        self.student_review_history = history[-self.MAX_REVIEW_HISTORY:]

    def _handle_ai_error(self, error):
        if isinstance(error, AIError):
            return ai_error_to_payload(error)

        return {
            "ok": False,
            "success": False,
            "error": "No se pudo completar la operacion de IA.",
            "code": "ai_error",
            "details": [],
        }

    @staticmethod
    def workbench_scenarios():
        """
        Escenarios para probar el XBlock en XBlock SDK.
        """
        return [
            (
                "IA Assistant - Student SDK",
                """
                <ia_assistant sdk_view_mode="student"/>
                """,
            ),
            (
                "IA Assistant - Studio SDK",
                """
                <ia_assistant sdk_view_mode="studio"/>
                """,
            ),
        ]

    @staticmethod
    def _parse_weight(raw):
        """Devuelve (valor, error). Vacio/None => sin peso (usa max_score)."""
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            return None, ""
        if isinstance(raw, bool):
            return None, "El peso debe ser un numero mayor que 0."
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None, "El peso debe ser un numero mayor que 0."
        if value != value or value <= 0 or value in (float("inf"),):
            return None, "El peso debe ser un numero mayor que 0."
        return value, ""

    @staticmethod
    def _parse_max_attempts(raw):
        """Devuelve (valor, error). Vacio/None => sin limite."""
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            return None, ""
        if isinstance(raw, bool):
            return None, "El maximo de intentos debe ser un entero mayor que 0."
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None, "El maximo de intentos debe ser un entero mayor que 0."
        if value != value or value < 1 or value != int(value) or value > 1000:
            return None, "El maximo de intentos debe ser un entero mayor que 0."
        return int(value), ""

    def _attempts_exhausted(self):
        return bool(
            self.max_attempts and (self.attempts or 0) >= self.max_attempts
        )

    @XBlock.json_handler
    def save_unit(self, data, suffix=""):
        """
        Guarda la unidad de Studio en unidad_json.
        """
        payload = self._extract_handler_payload(data)
        unit = payload.get("unit")

        if unit is None and "unidad_json" in payload:
            try:
                unit = json.loads(payload.get("unidad_json") or "{}")
            except (TypeError, ValueError):
                return {
                    "ok": False,
                    "success": False,
                    "error": "No se pudo interpretar unidad_json.",
                    "errors": [
                        {
                            "code": "invalid_unit_json",
                            "message": (
                                "No se pudo interpretar unidad_json como JSON válido."
                            ),
                            "field": "unidad_json",
                        }
                    ],
                    "warnings": [],
                }

        validation_payload = validate_and_normalize_studio_unit(unit)

        if not validation_payload.get("ok"):
            return {
                "ok": False,
                "success": False,
                "error": validation_payload.get(
                    "error", "La unidad no tiene un formato valido."
                ),
                "errors": validation_payload.get("errors", []),
                "warnings": validation_payload.get("warnings", []),
            }

        normalized_unit = validation_payload["unit"]

        weight = self.weight
        if "weight" in payload:
            weight, weight_error = self._parse_weight(payload.get("weight"))
            if weight_error:
                return {
                    "ok": False,
                    "success": False,
                    "error": weight_error,
                    "errors": [
                        {
                            "code": "invalid_weight",
                            "message": weight_error,
                            "field": "weight",
                        }
                    ],
                    "warnings": validation_payload.get("warnings", []),
                }

        max_attempts = self.max_attempts
        if "max_attempts" in payload:
            max_attempts, attempts_error = self._parse_max_attempts(
                payload.get("max_attempts")
            )
            if attempts_error:
                return {
                    "ok": False,
                    "success": False,
                    "error": attempts_error,
                    "errors": [
                        {
                            "code": "invalid_max_attempts",
                            "message": attempts_error,
                            "field": "max_attempts",
                        }
                    ],
                    "warnings": validation_payload.get("warnings", []),
                }

        if "prompt_docente" in payload:
            self.prompt_docente = payload.get("prompt_docente") or ""

        self.max_attempts = max_attempts
        self.weight = weight
        self.unidad_json = json.dumps(normalized_unit, ensure_ascii=False)

        response = {
            "ok": True,
            "success": True,
            "message": "Unidad guardada correctamente.",
            "unit": normalized_unit,
        }

        if validation_payload.get("warnings"):
            response["warnings"] = validation_payload["warnings"]

        return response

    @XBlock.json_handler
    def save_student_answers(self, data, suffix=""):
        payload = self._extract_handler_payload(data)
        answers = payload.get("answers")

        if not isinstance(answers, dict):
            return {
                "ok": False,
                "success": False,
                "error": "El campo 'answers' debe ser un diccionario.",
            }

        unit, _ = self._get_initial_unit()
        componentes = unit.get("componentes") if isinstance(unit, dict) else []
        allowed_types = {"quiz_multiple", "pregunta_abierta", "codigo"}
        component_map = {
            component.get("id"): component
            for component in componentes
            if isinstance(component, dict)
            and component.get("tipo") in allowed_types
        }

        normalized_answers = {}

        for component_id, answer in answers.items():
            if component_id not in component_map:
                return {
                    "ok": False,
                    "success": False,
                    "error": "Componente no valido: %s" % str(component_id),
                }

            if not isinstance(answer, dict):
                return {
                    "ok": False,
                    "success": False,
                    "error": "La respuesta para %s debe ser un objeto."
                    % str(component_id),
                }

            component = component_map[component_id]
            component_type = component.get("tipo")
            answer_type = answer.get("tipo") or component_type

            if answer_type != component_type:
                return {
                    "ok": False,
                    "success": False,
                    "error": "Tipo de respuesta invalido para %s."
                    % str(component_id),
                }

            metadata = answer.get("metadata") or {}
            if not isinstance(metadata, dict):
                return {
                    "ok": False,
                    "success": False,
                    "error": "metadata debe ser un diccionario para %s."
                    % str(component_id),
                }

            value = answer.get("value")
            normalized_value = None

            if component_type == "quiz_multiple":
                if (
                    value is None
                    or value == ""
                    or (isinstance(value, list) and len(value) == 0)
                ):
                    normalized_value = value
                elif isinstance(value, (str, int, float)):
                    normalized_value = str(value)
                elif isinstance(value, list):
                    normalized_value = [str(v) for v in value]
                else:
                    return {
                        "ok": False,
                        "success": False,
                        "error": "Valor de quiz_multiple invalido para %s."
                        % str(component_id),
                    }
            elif component_type == "pregunta_abierta":
                if value is None:
                    normalized_value = ""
                elif not isinstance(value, str):
                    return {
                        "ok": False,
                        "success": False,
                        "error": "Valor de pregunta_abierta debe ser texto para %s."
                        % str(component_id),
                    }
                elif len(value) > 8000:
                    return {
                        "ok": False,
                        "success": False,
                        "error": "La respuesta para %s es demasiado larga."
                        % str(component_id),
                    }
                else:
                    normalized_value = value
            elif component_type == "codigo":
                if value is None:
                    normalized_value = ""
                elif not isinstance(value, str):
                    return {
                        "ok": False,
                        "success": False,
                        "error": "Valor de codigo debe ser texto para %s."
                        % str(component_id),
                    }
                elif len(value) > 20000:
                    return {
                        "ok": False,
                        "success": False,
                        "error": "El codigo para %s es demasiado largo."
                        % str(component_id),
                    }
                else:
                    normalized_value = value
            else:
                return {
                    "ok": False,
                    "success": False,
                    "error": "Tipo de componente no soportado: %s."
                    % str(component_id),
                }

            normalized_answers[component_id] = {
                "componentId": component_id,
                "tipo": component_type,
                "value": normalized_value,
                "metadata": metadata,
            }

        self.student_answers = normalized_answers

        return {
            "ok": True,
            "success": True,
            "saved_count": len(normalized_answers),
        }

    @XBlock.json_handler
    def request_student_review(self, data, suffix=""):
        """Valida unidad y respuestas del alumno, detecta componentes auditables y
        devuelve una revisión MOCK temporal sin llamar a IA ni ejecutar código.
        Opcional: payload puede incluir "component_ids" (lista) para filtrar.
        """
        payload = self._extract_handler_payload(data)
        component_ids = payload.get("component_ids")

        # Cargar unidad validada
        unit, load_warning = self._get_initial_unit()
        if not isinstance(unit, dict) or not self._is_valid_unit(unit):
            return {
                "ok": False,
                "success": False,
                "error": "Unidad no valida.",
            }

        if self._attempts_exhausted():
            return {
                "ok": False,
                "success": False,
                "code": "attempts_exhausted",
                "error": (
                    "Ya usaste los {} intentos de revision disponibles."
                ).format(self.max_attempts),
                "attempts": self.attempts or 0,
                "max_attempts": self.max_attempts,
            }

        componentes = (
            unit.get("componentes", []) if isinstance(unit, dict) else []
        )
        allowed_types = {"quiz_multiple", "pregunta_abierta", "codigo"}

        # Construir mapa de componentes auditables desde unidad_json (no confiar en frontend)
        component_map = {}
        for comp in componentes:
            if not isinstance(comp, dict):
                continue
            cid = comp.get("id")
            ctype = comp.get("tipo")
            if not self._is_non_empty_string(
                cid
            ) or not self._is_non_empty_string(ctype):
                continue
            if ctype in allowed_types:
                component_map[cid] = comp

        # Si frontend pidió ids, validarlos contra unidad_json.
        # Nota: una lista vacía o ausencia de component_ids significa "revisar todos".
        if (
            component_ids is not None
            and isinstance(component_ids, list)
            and len(component_ids) > 0
        ):
            requested = [cid for cid in component_ids if cid in component_map]
            componentes_a_revisar = {
                cid: component_map[cid] for cid in requested
            }
        else:
            # component_ids ausente o vacío => revisar todos los auditables
            componentes_a_revisar = component_map

        if not componentes_a_revisar:
            # Añadir debug mínimo para facilitar diagnóstico en entorno de desarrollo
            component_types = [
                c.get("tipo") for c in componentes if isinstance(c, dict)
            ]
            unidad_raw = getattr(self, "unidad_json", None)
            unidad_empty = not bool(unidad_raw) or str(unidad_raw).strip() in (
                "",
                "{}",
            )
            return {
                "ok": False,
                "success": False,
                "error": "No hay componentes auditables para revisar.",
                "debug": {
                    "unit_title": (
                        unit.get("titulo") if isinstance(unit, dict) else ""
                    ),
                    "component_count": len(componentes),
                    "component_types": component_types,
                    "unidad_json_empty": unidad_empty,
                },
            }

        # Llamar al servicio real de revisión de estudiante (OpenRouter)
        answers = (
            self.student_answers
            if isinstance(self.student_answers, dict)
            else {}
        )

        from .services.student_review_service import generate_student_review

        result = generate_student_review(
            unit, answers, component_ids=list(componentes_a_revisar.keys())
        )

        # Si el servicio devolvió un error IA, result tendrá ok False y keys de error
        if not isinstance(result, dict) or not result.get("ok"):
            # Convertir a payload manejable por frontend
            if isinstance(result, dict):
                return result
            return {
                "ok": False,
                "success": False,
                "error": "No se pudo generar la revisión de IA.",
            }

        review = result.get("review") or {}

        if isinstance(review, dict):
            review = dict(review)
            review_meta = review.get("_ia_assistant")
            if not isinstance(review_meta, dict):
                review_meta = {}
            review_meta["frontend_answers_signature"] = (
                self._build_answers_signature_payload(answers)
            )
            review_meta["answers_signature"] = self._build_answers_signature(
                answers
            )
            review["_ia_assistant"] = review_meta

        # Solo las revisiones exitosas consumen intento: un error de la IA
        # no debe costarle un intento al alumno.
        self.attempts = (self.attempts or 0) + 1

        # Guardar resultado en user_state
        self.student_review_result = review

        grade_warning = self._publish_grade_from_review(review)
        self.student_review_result = review
        self._append_review_history(review)

        response = {
            "ok": True,
            "success": True,
            "review": review,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
        }
        if grade_warning:
            response["warnings"] = [{"message": grade_warning}]

        return response

    @XBlock.json_handler
    def generate_teacher_unit(self, data, suffix=""):
        """Genera una unidad completa a partir del prompt docente."""
        payload = self._extract_handler_payload(data)
        from .services.unit_service import generate_unit_from_teacher_prompt

        try:
            result = generate_unit_from_teacher_prompt(
                payload.get("prompt_docente"),
                self._build_context_payload(payload, preferred_key="contexto"),
            )
        except Exception as error:
            return self._handle_ai_error(error)

        return result

    @XBlock.json_handler
    def generate_teacher_component_create(self, data, suffix=""):
        """Genera un componente nuevo a partir del prompt docente."""
        payload = self._extract_handler_payload(data)
        from .services.component_service import (
            generate_component_create_from_teacher_prompt,
        )

        prompt_docente = payload.get("prompt_docente")
        target_component_type = payload.get("target_component_type")
        unit_context = self._build_context_payload(
            payload,
            preferred_key="unit_context",
        )

        try:
            result = generate_component_create_from_teacher_prompt(
                prompt_docente,
                target_component_type,
                unit_context=unit_context,
            )
        except Exception as error:
            return self._handle_ai_error(error)

        return result

    @XBlock.json_handler
    def generate_teacher_component_edit(self, data, suffix=""):
        """Edita un componente activo a partir del prompt docente."""
        payload = self._extract_handler_payload(data)
        from .services.component_service import (
            generate_component_edit_from_teacher_prompt,
        )

        prompt_docente = payload.get("prompt_docente")
        active_component = payload.get("active_component")
        unit_context = self._build_context_payload(
            payload,
            preferred_key="unit_context",
        )

        try:
            result = generate_component_edit_from_teacher_prompt(
                prompt_docente,
                active_component,
                unit_context=unit_context,
            )
        except Exception as error:
            return self._handle_ai_error(error)

        return result
