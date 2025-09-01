# conjure

Decentralized immersive collaboration powered by the [Enchantment Engine](https://github.com/EnchantmentEngine/EnchantmentEngine) and (ADAM)[https://github.com/coasys/ad4m/]

https://conjure.world

### Spatial Interface

An ideal interface is once that is collaborative and immersive from it's foundation. Imagine physically grabbing and connecting tools together in a 3D space, using your voice and gestures to collaborate with others and LLM agents.

Conjure is an enchanted interface in an immersive 3D context, using the web browser as a portal to a realm of collaboration.

## ADAM Integration

ADAM is a fully decentralized and evolvable social network framework. It enables agent-centric identity, realtime communication and modular plugins for coherence and collaboration. Conjure uses ADAM to establish a sovereign data and identity backend.

## Tool Conjuring

https://conjure.world/tools

Tools are simple bite sized functions or [JSON Schema Transformers](https://github.com/HexaField/jsonpath-object-transform) that transform data from one shape to another.

Input and ouput schemas are content hashed, as well as the transformer, which allows a unified univeral library of tools for particular transformations. As you go to graph something, it will search for tools that match the input and output shape hashes. Hashes are SHA256 and schemas are canonicalised JSON Schemas (property order independent).

A pipelines is a DAG describing a set of connected tools. It can take any number of inputs and deterministically figure out how to get a particular set of outputs. This enables a kind of 'smartness' that doesn't directly rely on LLMs, just a robust composable transformation library. Pipelines can embed other pipelines to compose increasingly complex functionality together.

This allows any number of sources to be modularly aggregated together into any appropriate visualisation. A higher level prompting system can take a request and turns it into a pipeline which can be repeated and provably robust.

All function transformations run in isolated webworker contexts in order for heavy operations are offloaded from the main thread as well as sandboxed from sensitive user data. Further steps in the future is to have LLMs run security checks and do static code analysis on tools to verify them before use.

### Help

To run Ollama with CORS allowed: `OLLAMA_ORIGINS='*' ollama serve` or `OLLAMA_ORIGINS='https://conjure.world' ollama serve`
