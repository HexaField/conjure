# conjure

Decentralized immersive collaboration powered by iR Engine and ADAM/Holochain

https://conjure.world

## ADAM Integration

ADAM is a fully decentralized and evolvable network framework. It enables agent-centric identity, realtime connectivity and interoperable tools for coherence and collaboration.

- [x] Connect to ADAM
- [x] Retrieve list of perspectives & neighbourhoods
- [x] implement p2p signalling
- [x] realtime media support
- [ ] create and leave neighbourhoods
- [ ] spawn and persist world objects in the neighbourhood
- [ ] package reusable hooks to npm

## Tool Conjuring

Tools are simple bite sized functions that transform data from one shape to another.

Input and ouput schemas are content hashed, as well as the transformation function, which allows a unified univeral library of tools for particular transformations. As you go to graph something, it will search for tools that match the input and output shape hashes. Hashes are SHA256 and schemas are canonicalised JSON Schemas (property order independent). Hashing transformation functions is inspired by Holochain DNA, and may eventually be implemented as zome calls.

A pipelines is a graph describing a set of connected tools. It can take any number of inputs and deterministically figure out how to get a particular set of outputs. This enables a kind of 'smartness' that doesn't directly rely on LLMs, just a robust composable transformation library. Pipelins can embed other pipelines to compose increasingly complex functionality together.

This allows any number of sources to be aggregated together into any appropriate visualisation. A higher level prompting system can take a request and turns it into a pipeline which can be repeated and provably robust.

All transformations are secure and run in isolated webworker contexts in order for heavy operations are offloaded from the main thread as well as sandboxed from crucial user sensitive data. Further steps in the future is to have LLMs run security checks and do static code analysis on tools to verify them before use.

### Spatial Interface

An ideal interface is once that is collaborative and immersive from it's foundation. Imagine physically grabbing and connecting tools together in a 3D space, using your voice and gestures to collaborate with others and LLM agents.

Other enhancements are non-URL inputs and non-graph outputs, (https://unit.land/ is a great example of a fleshed out system).

https://conjure.world/graph

### Progress - Pipelines/Graphs

- [x] We need to change the tool edit to include types of inputs
- [x] Types of inputs are URL & already known
- [ ] Tool creation view finds existing tools prior to creating a new one
- [ ] Pull out data aggregator
- [ ] Create schema edit view
- [ ] Create graph registry
  - [ ] 2D reactflow UI to connect tools & graphs together
  - [ ] Graphs can contain other graphs
  - [ ] Graphs have input and output schema type, but how do we describe everything between?
- [ ] External tool calling
  - [ ] LLM Query
  - [ ] Web search
  - [ ] https://exa.ai/
  - [ ] look at what unit does
- [ ] Semantic search for tools

### Progress - More graph types

- [ ] 3D plot
- [ ] 3D surface
- [ ] 3D DAG network https://medium.com/inthepipeline/visualize-thousands-of-dbt-models-in-this-3d-dag-viewer-e101871c1577
- [ ] Globe https://globe.gl/


### Help

To run Ollama with CORS allowed:
`OLLAMA_ORIGINS='*' ollama serve` or `OLLAMA_ORIGINS='https://conjure.world' ollama serve`