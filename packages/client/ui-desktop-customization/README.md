# Desktop customization

English | [中文](README.zh.md)

Desktop-only browser plugin for learner-facing visual enhancement and the visible update center. The package is mounted only when the Desktop Host exports `DSH_DESKTOP=1`; persistence and update operations cross the fixed Electron preload bridge. The update card labels the Studio shell version and embedded Harness core version separately.

The desktop demo keeps the image-free official original UI as its only appearance. The appearance runtime normalizes legacy skin and custom-image settings to the official appearance; no background selection page or custom image path is exposed.

The visual-enhancement Settings row and composer shortcut consume one Host-backed status source. When disabled, the shortcut first selects the built-in DeepSeek vision model for the session and future blank sessions and then activates its native route; when enabled, it disables the capability through the same Settings namespace. Exact model metadata selects one request path after later model changes: an image-capable primary model receives native image content, while a text-only model may use an already verified compatible sidecar. The built-in DeepSeek vision route normally sends deterministic request images through reusable Files API references and falls back to bounded all-inline images when file resolution fails. The setup dialog offers Bailian, OpenRouter, Ollama, vLLM, SGLang, and a generic OpenAI-compatible route. Bailian remains fixed to `qwen3.8-max`; OpenRouter defaults to `openai/gpt-4.1-mini`; every self-hosted route requires an explicit vision-model id and exposes an editable API base with presets for Ollama (`127.0.0.1:11434/v1`), vLLM (`127.0.0.1:8000/v1`), and SGLang (`127.0.0.1:30000/v1`). Local API keys are optional, while supplied keys are stored under application-owned credential references; ambient `DASHSCOPE_API_KEY` and `OPENROUTER_API_KEY` values remain read-only fallbacks. Compatible routes append `/chat/completions`, send OpenAI-compatible image parts without redirects, and persist the endpoint only after real-image verification succeeds. Host-pushed settings and credential updates refresh both entries together.

## Model Experience

None, as this browser-side package only controls the Host-owned visual capability and registers no model-facing context itself.

#### KV Cache effect

The package itself adds no tokens or KV-cache entries; after this UI enables visual enhancement, the Host-owned capability governs all Skill, Tool, and visual-observation effects.

## Known Limitations and Deferred Work

- The current learner-facing update card keeps online actions disabled; it reports both installed versions and directs learners to the release page.
- Signed installers, platform release metadata, and release publishing are deferred to the three-platform packaging phase.
