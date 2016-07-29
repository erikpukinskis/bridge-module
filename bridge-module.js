var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-browser-library",
  ["nrtv-tree", "nrtv-library"],
  function(Tree, Library) {

    function bridgeModule(sourceLibrary, name, bridge) {

      var libraryIdentifier = bridgeLibrary(bridge)

      function deAlias(name) {
        return sourceLibrary.aliases[name] || name
      }

      name = deAlias(name)

      var moduleBinding = bridge.__nrtvModuleBindings[name]

      if (moduleBinding) { return moduleBinding }

      var module = sourceLibrary.modules[name]

      if (!module) {
        throw new Error(sourceLibrary.id+" does not seem to know about any so-called \""+name+"\" module")
      }

      var deps = module.dependencies.map(deAlias)

      var func = module.func

      deps.forEach(function(dep) {
        bridgeModule(sourceLibrary, dep, bridge)
      })

      var moduleBinding =
        new BoundModule(
          name,
          func,
          deps,
          libraryIdentifier
        )

      bridge.asap(
        moduleSource(libraryIdentifier, name, deps, func)
      )

      bridge.__nrtvModuleBindings[name] = moduleBinding

      return moduleBinding
    }


    function bridgeLibrary(bridge) {
      var binding = bridge.__nrtvLibraryBinding

      if (binding) { return binding.binding.identifier }

      var treeSingleton = bridge.defineSingleton("Tree", Tree.generator)

      var librarySingleton = bridge.defineSingleton(
        "Library",
        [treeSingleton],
        Library.generator
      )

      // This is exactly what the library bridge is for. Except in order to handle dependencies we need to handle some dependencies, so there is a bootstrapping problem.

      // So we just rely on tree and library to expose their generators, and we rely on those modules not having any other dependencies. We load those singletons by hand and then after that we can use the library to hook up dependencies.

      // generator maybe is the wrong word. this uses "definition function": https://addyosmani.com/writing-modular-js/ which is fairly literal. It's the function we use for defining the module.

      // Definition. Define. Yup. Definer? defineFunction? Eep, that's ambiguously a verb phrase too.

      var libraryBinding = bridge.defineSingleton(
        "library",
        [librarySingleton],
        function(Library) {
          return new Library()
        }
      )

      bridge.__nrtvModuleBindings = {}
      bridge.__nrtvLibraryBinding = libraryBinding

      return libraryBinding.binding.identifier
    }

    // Uh oh. This should be coming from function-call!!

    function BoundModule(name, func, dependencies, libraryKey, args) {
      if (!name) {
        throw new Error("where's the name?")
      }
      this.name = name
      this.func = func
      this.dependencies = dependencies
      this.libraryKey = libraryKey
      this.args = args
      this.__BrowserBridgeBinding = true
    }

    BoundModule.prototype.get =
      function() {
        return this.libraryKey+".get(\""+this.name+"\")"
      }

    BoundModule.prototype.callable =
      function() {
        if (this.args) {
          return this.get()+".bind(null, "+argumentString(this.args)+")"
        } else {
          return this.get()
        }
      }

    BoundModule.prototype.evalable =
      function() {
        if (this.args) {
          return this.get()+"("+argumentString(this.args)+")"
        } else {
          return this.get()
        }
      }

    BoundModule.prototype.withArgs =
      function() {
        var args = Array.prototype.slice.call(arguments)

        if (this.args) {
          var args = [].concat(this.args, args)
        } else {
          var args = args
        }

        return new BoundModule(this.name, this.func, this.dependencies, this.libraryKey, args)
      }

    function argumentString(args) {
      return args.map(argToString).join(", ")
    }

    function argToString(arg) {
      var isBinding = arg && arg.binding && arg.binding.__BrowserBridgeBinding

      if (isBinding) {
        return arg.callable()
      } else {
        return JSON.stringify(arg)
      }
    }

    function moduleSource(libraryIdentifier, name, deps, func) {
      return libraryIdentifier+".define("+JSON.stringify(name)+", "+JSON.stringify(deps)+", "+func.toString()+")"
    }

    return bridgeModule
  }
)