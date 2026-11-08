# Native Memingo runtime

Files ending in `.mgo` are intended to run using the Memingo language runtime.

The dispatcher should pass the selected file to Memingo's existing execution interface rather than reimplementing Memingo syntax inside Node.mgo.

## Example

```mgo
vibe name = "Node.mgo"
spill "Hello from " + name
```

## Integration checklist

- [ ] Identify the stable Memingo runtime entry point.
- [ ] Invoke it without shell-string interpolation.
- [ ] Preserve useful source file and error information.
- [ ] Add an integration test using a small `.mgo` program.

No launcher implementation is included in this initial scaffold.
