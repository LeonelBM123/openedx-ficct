import json
import unittest

from xblock.field_data import DictFieldData
from xblock.fields import ScopeIds
from xblock.test.tools import TestRuntime

from ia_assistant.xblock import IAAssistantXBlock


def build_block(unidad_json=None):
    runtime = TestRuntime(services={"field-data": DictFieldData({})})
    block = IAAssistantXBlock(
        runtime,
        scope_ids=ScopeIds("teacher", "ia_assistant", "def_id", "usage_id"),
    )
    if unidad_json is not None:
        block.unidad_json = unidad_json
    return block


class AuthorViewTests(unittest.TestCase):
    def test_empty_unit_shows_empty_state(self):
        fragment = build_block().author_view()

        self.assertIn("ia-assistant-author-empty", fragment.content)
        self.assertIn("Editar", fragment.content)

    def test_configured_unit_renders_student_view(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [
                {
                    "id": "teoria_1",
                    "tipo": "teoria",
                    "nombre": "Teoria",
                    "puntaje": 0,
                    "data": {"formato": "markdown", "contenido": "Hola"},
                }
            ],
        }
        fragment = build_block(json.dumps(unit)).author_view()

        self.assertNotIn("ia-assistant-author-empty", fragment.content)
        self.assertEqual(fragment.js_init_fn, "IAAssistantStudent")

    def test_studio_view_exposes_weight(self):
        block = build_block()
        block.weight = 4.0
        block._handler_url = lambda name: "/handler/" + name
        fragment = block.studio_view()

        self.assertEqual(fragment.json_init_args["weight"], 4.0)

    def test_save_unit_persists_weight(self):
        block = build_block()
        handler = IAAssistantXBlock.save_unit.__wrapped__
        unit = {"version": 1, "titulo": "U", "componentes": []}

        result = handler(block, {"unit": unit, "weight": "3"}, "")

        self.assertTrue(result["ok"], result)
        self.assertEqual(block.weight, 3.0)

    def test_save_unit_rejects_invalid_weight(self):
        block = build_block()
        handler = IAAssistantXBlock.save_unit.__wrapped__
        unit = {"version": 1, "titulo": "U", "componentes": []}

        result = handler(block, {"unit": unit, "weight": "-2"}, "")

        self.assertFalse(result["ok"])
        self.assertIsNone(block.weight)
