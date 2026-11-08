# Memingo feature inventory for Node.mgo

This inventory is based on the original `Reaccionador2Jeje/Memingo` repository's `README.md`, `LANGUAGE.md`, and `TODO.md` on its `main` branch. It separates implemented features from roadmap items so planned work is not mistaken for existing functionality.

## 1. Language and interpreter

### Values and types
- Numbers, strings, booleans, `ghost`, lists and objects.
- Memingo type names documented by the project: `whole`, `caption`, `party`, `based-or-cringe`, and `ghost`.
- Object property access with dot notation and bracket notation.
- List and object literals can span multiple lines and accept trailing commas.

### Syntax and statements
- `vibe`: variable declaration.
- `ritual`: function declaration.
- `spill`: output/print.
- `drop`: return a value; at top level it stops the program and returns that value.
- `when / nah`: conditional branching.
- `grind`: while-style loop.
- `borrow`: load an installed package entry point.
- Comments, keywords, literals and operators are handled by the lexer.
- Parser supports variables, functions, blocks, conditions and loops.
- Tree-walking interpreter; recursion is supported.

### Operators
- Arithmetic: `+`, `-`, `*`, `/`, `%`.
- Comparison: `<`, `>`, `<=`, `>=`.
- Equality: `==`, `!=`.
- Logic: `&&`, `||`, `!`.
- `+` also concatenates strings.

## 2. Built-ins and standard library

The functions below are explicitly documented in `LANGUAGE.md`.

### Values and collections
- `headcount(value)`
- `whatkind(value)`
- `keys(object)`
- `values(object)`
- `push(list, value)`
- `append(list, value)`
- `set_value(container, key, value)`
- `delete_key(object, key)`
- `sort(list, descending?)`
- `reverse(list)`
- `unique(list)`
- `sum(list)`
- `min(values)`, `max(values)`
- `slice(value, start, end?)`

### Text
- `upper(text)`, `lower(text)`, `trim(text)`
- `split(text, separator?)`
- `join(list, separator?)`
- `replace(text, old, new)`
- `contains(text, value)` (also supports lists and object keys)
- `starts_with(text, prefix)`, `ends_with(text, suffix)`
- `repeat(text, count)`
- `lines(text)`
- `meme_case(text)`
- `shuffle(list)`
- `uuid()`

### Numbers
- `abs(value)`, `floor(value)`, `ceil(value)`, `round(value)`
- `clamp(value, low, high)`
- `parse_int(text)`, `parse_float(text)`
- `random()`
- `random_int(low, high)`
- `range(end)`, `range(start, end)`, `range(start, end, step)`

### Higher-order functions
- `map(list, function)`
- `filter(list, function)`
- `reduce(list, function, initial?)`

### Data, time and network
- `json_parse(text)`
- `json_stringify(value)`
- `env(name, default)`
- `now()`
- `sleep(seconds)`
- `http_get(url)`
- `http_post(url, object)`

### Project-scoped files
- `read_file(path)`
- `write_file(path, text)`
- `file_exists(path)`
- `list_files(path)`
- File helpers are restricted to the project directory and reject absolute paths and `..` escapes.
- Built-in failures are reported as Memingo runtime errors with the function name.

## 3. Package ecosystem: mgoa

Documented package workflows:
- `mgoa search`
- `mgoa info <package>`
- `mgoa list`
- `mgoa add <registry-name|local-directory|ZIP|HTTP(S)-archive-URL>`
- `mgoa install`
- `mgoa update`
- `mgoa remove <package>`
- `mgoa publish <directory>`
- `mgoa completion bash|zsh|fish`

Package sources and registry behavior:
- Curated default registry.
- Other registries exposing either an `approved.packages` table or a plain `packages` table.
- Local directories and ZIP archives.
- Direct HTTP(S) archive URLs, optionally pinned with `#sha256=<digest>`.
- `--registry <url>` and `MGOA_REGISTRY` select another registry.
- `memingo.lock.json` records source and checksums for reproducible installs.
- Safe ZIP extraction, path-traversal protection and SHA-256 verification.
- Registry catalog includes packages for math, statistics, strings, lists, JSON, environment variables, files, random values, time, UUIDs, validation, templates, colors, Markdown, CSV, games, CLI output, testing and memes.
- Packages can expose rituals and vibes through `borrow`.

## 4. Project and CLI ecosystem

Documented commands and workflows include:
- `memingo init`
- `memingo run` (file or project)
- `memingo eval`
- `memingo check`
- `memingo dev` (file-change watcher)
- `memingo test`
- `memingo build` (ZIP project archive)
- `memingo serve` (static HTTP serving launcher)
- `memingo repl`
- `memingo fmt`
- `memingo install`, `memingo add`, `memingo remove`, `memingo update`
- `memingo info`, `memingo deps`, `memingo clean`
- `memingo manifest`
- `memingo doctor`, `memingo status`
- `memingo update-self`
- `memingo completion bash|zsh|fish`
- Project-aware commands can create a missing `memingo.toml` and project scaffolding without overwriting an existing manifest.
- Project configuration, dependency table, `.env`, `.gitignore` and `main.mgo` scaffolding are documented.

## 5. Other shipped ecosystem features

- MemeCraft playable voxel game and `examples/minecraft.mgo` world configuration.
- Static HTTP server and `memingo serve` launcher.
- Syntax highlighter.
- VS Code extension.
- Formatter.
- Bilingual website and online documentation.
- REPL and shell completions for Bash, Zsh and Fish.
- Linux/macOS installer and Windows PowerShell installer.
- Debian/Ubuntu `.deb` and Fedora/RHEL `.rpm` package generation.
- Linux APT and RPM repository metadata generation.
- Python 3.10 or newer is required by the current Memingo distribution; the installer does not require pip package installation.

## 6. Roadmap items — not to be claimed as implemented

The source `TODO.md` marks these as incomplete:
- Better error locations and source snippets.
- Language modules and imports.
- Game/app-specific standard library.
- Native compiler or bytecode VM.
- Package signing and verification.
- Memingo HTTP server API, routes, methods, middleware, request/response objects, templates, JSON/file uploads and hot reload.
- Language Server Protocol, debugger and online playground.
- Cross-platform release builds, full language specification and contributor guide.

## 7. Node.mgo preservation rule

Node.mgo must retain every feature in sections 1–5 for the selected Memingo baseline. Section 6 must remain clearly labelled as Memingo roadmap work unless it is later implemented upstream. Integration must be checked against the original Memingo tests and real example projects; this document is an inventory, not proof that Node.mgo has already integrated the features.
