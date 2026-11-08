# Node.mgo

Node.mgo is a Node.js-based runtime for the **Memingo** programming language. It runs regular JavaScript files with Node.js and also executes `.mgo` programs with the Memingo interpreter, standard library, formatter, REPL and package manager.

- Runtime: Node.js 18 or newer for development; standalone binaries need no runtime
- Language: Memingo 0.2
- License: GNU General Public License 3.0
- Maintained by Atdev Dev
- Website: https://reaccionador2jeje.github.io/Node.mgo-/

## Install without Node.js

The standalone installers download a self-contained binary that includes the Memingo interpreter and standard library. No Node.js, Python or other runtime is required to run `.mgo` programs.

### Linux

```bash
curl -fsSL https://reaccionador2jeje.github.io/Node.mgo-/install.sh | sh
```

Supports x64 and arm64. Installs `node_mgo`, `memingo` and `mgoa` in `~/.local/bin`.

### macOS

```bash
curl -fsSL https://reaccionador2jeje.github.io/Node.mgo-/install-macos.sh | sh
```

Supports Apple Silicon and Intel. The installer removes the quarantine attribute; the binary is not notarized yet.

### Windows (PowerShell)

```powershell
irm https://reaccionador2jeje.github.io/Node.mgo-/install.ps1 | iex
```

Supports x64. Installs in `%LOCALAPPDATA%\Node.mgo\bin` and adds it to the user `PATH`.

You can change the destination with `NODE_MGO_BIN_DIR` and pin a release with `NODE_MGO_VERSION`. Manual download links are available on the [downloads page](https://reaccionador2jeje.github.io/Node.mgo-/downloads/).

## Quick start

```bash
git clone https://github.com/Reaccionador2Jeje/Node.mgo-.git
cd Node.mgo-

# Run a Memingo program
node bin/node_mgo.js examples/hello.mgo

# Evaluate inline code
node bin/node_mgo.js eval 'spill 2 + 2'

# Start the REPL
node bin/node_mgo.js repl

# Run a project (reads memingo.toml)
node bin/node_mgo.js run

# JavaScript still works
node bin/node_mgo.js app.js
```

Install the commands on your `PATH`:

```bash
npm link
node_mgo --version
memingo --version
mgoa --version
```

`node_mgo` and `memingo` are the same executable. `mgoa` is the package manager.

## Language

### Values

| Memingo value | Meaning |
| --- | --- |
| `whole` | number |
| `caption` | string |
| `party` | list or object |
| `based` | true |
| `cringe` | false |
| `ghost` | null |

```mgo
vibe count = 12
vibe text = "hello"
vibe active = based
vibe missing = ghost
vibe values = [1, 2, 3]
vibe profile = {name: "Ana", role: "builder"}
```

### Statements

- `vibe` declares a variable
- `ritual` declares a function
- `spill` prints a value
- `drop` returns from a ritual (or stops a top-level program)
- `when / nah` is the conditional
- `grind` repeats while a condition is true
- `borrow` loads an installed package

```mgo
# Vibes are variables
vibe name = "Memingo"
spill "Hello " + name

# When a condition is based, the ritual continues
when 8 > 3 {
    spill "this is based"
} nah {
    spill "that's cringe"
}

vibe i = 1
grind i <= 3 {
    spill i
    i = i + 1
}

# A ritual is a function
ritual factorial(n) {
    when n <= 1 {
        drop 1
    }
    drop n * factorial(n - 1)
}

spill factorial(5)
```

### Objects and access

```mgo
vibe profile = {name: "Ana", role: "builder"}
set_value(profile, "status", "based")

spill profile.name
spill profile["status"]
spill json_stringify(profile)
```

Lists and objects can span multiple lines and trailing commas are allowed.

```mgo
vibe world = {
    name: "MemeCraft",
    day: based
}
vibe materials = [
    {name: "grass", solid: based},
    {name: "stone", solid: based},
]
```

### Operators

- Arithmetic: `+ - * / %`
- Comparison: `< > <= >=`
- Equality: `== !=`
- Logic: `&& || !`

`+` also concatenates strings.

## Standard library

### Values and collections

- `headcount(value)` counts lists, objects and strings
- `whatkind(value)` reports the Memingo type
- `keys(object)` lists object keys
- `values(object)` lists object values
- `push(list, value)` appends a value and returns the value
- `append(list, value)` appends a value and returns the new length
- `set_value(container, key, value)` assigns a list or object member
- `delete_key(object, key)` removes an object member
- `sort(list, descending?)` returns a sorted copy
- `reverse(list)` returns a reversed copy
- `unique(list)` removes duplicate values while keeping order
- `sum(list)` adds a list of numbers
- `min(values)` and `max(values)` accept a list or separate numbers
- `slice(value, start, end?)` slices a list or string

### Text

- `upper(text)`, `lower(text)` and `trim(text)`
- `split(text, separator?)` returns a list of parts
- `join(list, separator?)` joins values into text
- `replace(text, old, new)`
- `contains(text, value)` also works on lists and object keys
- `starts_with(text, prefix)` and `ends_with(text, suffix)`
- `repeat(text, count)` repeats text `count` times
- `lines(text)` splits text into a list of lines
- `meme_case(text)` alternates uppercase and lowercase letters
- `shuffle(list)` returns a shuffled copy
- `uuid()` returns a random UUID string

### Numbers

- `abs(value)`, `floor(value)`, `ceil(value)` and `round(value)`
- `clamp(value, low, high)` keeps a number inside a range
- `parse_int(text)` and `parse_float(text)` convert text to numbers
- `random()` returns a decimal between 0 and 1
- `random_int(low, high)` returns an integer in the inclusive range
- `range(end)`, `range(start, end)` and `range(start, end, step)`

### Higher-order functions

- `map(list, function)` applies a function to every item
- `filter(list, function)` keeps items where the function returns a truthy value
- `reduce(list, function, initial?)` combines items into one value

```mgo
ritual double(n) { drop n * 2 }
ritual even(n) { drop n % 2 == 0 }
ritual combine(a, b) { drop a + b }

spill map([1, 2, 3], double)
spill filter([1, 2, 3, 4], even)
spill reduce([1, 2, 3, 4], combine, 0)
```

### Data, time and network

- `json_parse(text)` parses JSON
- `json_stringify(value)` serializes JSON
- `env(name, default)` reads an environment variable
- `now()` returns the current Unix timestamp
- `sleep(seconds)` pauses execution
- `http_get(url)` reads text or JSON
- `http_post(url, object)` sends JSON and reads text or JSON

### Files

File helpers are restricted to the project directory and reject absolute paths or `..` escapes.

- `read_file(path)` reads a UTF-8 text file
- `write_file(path, text)` writes a UTF-8 text file, creating parent directories
- `file_exists(path)` returns `based` or `cringe`
- `list_files(path)` returns a sorted list of directory entries

```mgo
write_file("notes/hello.txt", "hola")
spill read_file("notes/hello.txt")
spill file_exists("notes/hello.txt")
spill list_files("notes")
```

### Packages

```mgo
borrow "hello-memes"
greet("Team")
```

`borrow` loads the entry point recorded in `memingo.lock.json` from `.memingo/packages/<name>`.

## CLI

```bash
node_mgo <file.mgo>              # run a Memingo file
node_mgo <file.js>               # run a JavaScript file with Node
node_mgo run [file|project]      # run a file or project entry point
node_mgo eval "<code>"           # evaluate inline Memingo code
node_mgo repl                    # interactive REPL
node_mgo check [path]            # validate Memingo syntax
node_mgo fmt [path] [--check]    # format Memingo source
node_mgo init [dir] [--name N]   # create a project
node_mgo dev [file|project]      # re-run on changes
node_mgo test [path]             # run Memingo test files
node_mgo build [dir]             # build dist/<name>-<version>.zip
node_mgo serve [dir] [--port N]  # serve static files
node_mgo install [dir]           # create dependency records
node_mgo add <name>[=version]    # add a dependency
node_mgo remove <name>           # remove a dependency
node_mgo info [dir]              # show project information
node_mgo deps [dir]              # list dependencies
node_mgo clean [dir]             # remove dist/ and .memingo/
node_mgo manifest [dir]          # create memingo.toml
node_mgo doctor [dir]            # diagnose the project
node_mgo status [dir]            # show runtime status
node_mgo completion <shell>      # bash, zsh or fish completions
node_mgo --version
```

`run`, `build`, `info`, `deps`, `clean`, `install`, `add`, `remove` and the equivalent project commands create a missing `memingo.toml`, `main.mgo`, `.env` and `.gitignore` automatically. An existing manifest is never overwritten.

## Project format

```toml
[package]
name = "my-app"
version = "0.2.0"
entry = "main.mgo"

[dependencies]
hello-memes = "0.1.0"
```

`memingo.lock.json` records the source, entry point, archive and SHA-256 checksum of every installed package.

## Package manager (`mgoa`)

```bash
mgoa search
mgoa info hello-memes
mgoa list
mgoa add hello-memes
mgoa add ./mypackage
mgoa add ./mypackage.zip
mgoa add https://example.com/packages/mypackage-1.0.0.zip
mgoa add https://example.com/packages/mypackage-1.0.0.zip#sha256=<digest>
mgoa install
mgoa update
mgoa remove hello-memes
mgoa publish ./mypackage
```

`mgoa` supports registry packages, local directories, local ZIP archives and direct HTTP(S) archives. Downloads are verified with SHA-256 and ZIP extraction rejects path traversal. Use `--registry` through `MGOA_REGISTRY` to point at another registry.

The official registry is `https://reaccionador2jeje.github.io/Memingo/mgoa/index.json`. If that GitHub Pages URL is unavailable, `mgoa` falls back to the registry stored in the Memingo GitHub repository.

## Examples

- `examples/hello.mgo` — variables, conditions and loops
- `examples/functions.mgo` — rituals and recursion
- `examples/stdlib.mgo` — a tour of the standard library
- `examples/minecraft.mgo` — MemeCraft world configuration

## Tests

```bash
node --test test/
```

The suite covers the lexer, parser, interpreter, every standard-library family, file sandboxing, the formatter, the CLI and the package manager.

## Repository layout

```
bin/node_mgo.js      Node.mgo / memingo executable
bin/mgoa.js          package manager executable
src/lexer.js         tokenizer
src/parser.js        recursive-descent parser
src/interpreter.js   tree-walking interpreter and standard library
src/formatter.js     source formatter
src/manifest.js      memingo.toml and lockfile helpers
src/mgoa.js          package manager
src/zip.js           ZIP reader/writer
src/cli.js           command-line interface
test/                node:test suite
examples/            sample programs
```

## License

Node.mgo is distributed under the GNU General Public License 3.0. See `LICENSE`.
