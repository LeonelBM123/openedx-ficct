from setuptools import find_packages, setup


setup(
    name="ia-assistant-plugin",
    version="0.2.0",
    description="Asistente Inteligente para Open edX - UAGRM",
    packages=find_packages(),
    install_requires=[
        "XBlock",
        "web-fragments",
    ],
    entry_points={
        "xblock.v1": [
            "ia_assistant = ia_assistant.xblock:IAAssistantXBlock",
        ],
    },
    include_package_data=True,
    package_data={
        "ia_assistant": [
            "static/**/*",
            "public/**/*",
        ],
    },
    zip_safe=False,
)
