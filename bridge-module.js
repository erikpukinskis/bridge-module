var library = require("nrtv-library")(require)

module.exports = library.export(
  "bridge-module",
  ["nrtv-tree", "nrtv-library", "function-call"],
  function(Tree, Library, functionCall) {

    function bridgeModule(sourceLibrary, originalName, bridge, parent) {

      var libraryIdentifier = bridgeLibrary(bridge)

      function deAlias(name) {
        return sourceLibrary.aliases[name] || name
      }

      var name = deAlias(originalName)

      var moduleBinding = bridge.__nrtvModuleBindings[name]

      if (moduleBinding) { return moduleBinding }


      var module = sourceLibrary.modules[name]

      if (!module) {
        sourceLibrary.import(originalName)
        name = deAlias(originalName)
        module = sourceLibrary.modules[name]
      }

      if (!module) {
        throw new Error(sourceLibrary.id+" does not seem to know about any so-called \""+name+"\" module")
      }

      var deps = module.dependencies.map(deAlias)

      var func = module.func

      deps.forEach(function(dep) {
        var path = parent ? parent+" depends on "+name : name

        if (dep == "browser-bridge") {
          var message = "Trying to use bridgeModule to put browser-bridge on a bridge"
          if (parent) {
            message = message + ", because "+path+" depends on browser-bridge"
          }
          message = message + ". This is very confusing. I refuse to do it."

          throw new Error(message)
        }

        bridgeModule(sourceLibrary, dep, bridge, path)

        previousDep = dep
      })

      var moduleBinding =
        new BoundModule(
          name,
          func,
          deps,
          libraryIdentifier
        )

      if (parent) {
        var comment = "// "+name+" loaded as a dependency because "+parent
      } else {
        var comment = loadedComment()
      }
      bridge.asap(
        comment+"\n"+
        moduleSource(libraryIdentifier, name, deps, func)
      )

      bridge.__nrtvModuleBindings[name] = moduleBinding

      return moduleBinding
    }

    function loadedComment() {
      try {
        throw new Error("bridge-module induced this error for introspection purposes")
      } catch (e) {
        var origin = e.stack.split("\n")[3].substr(7)
        return "// module loaded from "+origin
      }
    }

    bridgeModule.definitionWithDeps = function(library, name, bridge) {

      var binding = bridgeModule(library, name, bridge)

      var deps = allDepsFor(name, bridge.__nrtvModuleBindings)

      return deps.map(toSource).join("\n\n")

      function toSource(dep) {
        var module = bridge.__nrtvModuleBindings[dep]

        return moduleSource(binding.libraryIdentifier, module.name, module.dependencies, module.func)
      }
    }

    function allDepsFor(name, bindings, all) {
      if (!all) { all = [] }
      if (contains(all, name)) { return }
      var binding = bindings[name]
      binding.dependencies.forEach(function(dep) {
        allDepsFor(dep, bindings, all)
      })
      all.push(name)
      return all
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

    function BoundModule(name, func, dependencies, libraryIdentifier, args) {
      if (!name) {
        throw new Error("where's the name?")
      }
      this.name = name
      this.func = func
      this.dependencies = dependencies
      this.libraryIdentifier = libraryIdentifier
      this.args = args
      this.__isFunctionCallBinding = true
    }

    BoundModule.prototype.asBinding = function() {
      return new BindingBinding(this)
    }

    function BindingBinding(boundModule) {
      this.boundModule = boundModule
    }

    BindingBinding.prototype.callable = function() {
      var source = "functionCall(\"library.get(\\\""+this.boundModule.name+"\\\")\")"

      var hasArgs = this.boundModule.args && this.boundModule.args.length > 0

      if (hasArgs) {
        source += ".withArgs("+functionCall.argumentString(this.boundModule.args)+")"
      }

      return source
    }

    BoundModule.prototype.get =
      function() {
        return this.libraryIdentifier+".get(\""+this.name+"\")"
      }

    BoundModule.prototype.callable =
      function(options) {
        if (this.args && this.args.length > 0) {
          return this.get()+".bind(null, "+functionCall.argumentString(this.args)+")"
        } else {
          return this.get()
        }
      }

    BoundModule.prototype.evalable =
      function(options) {
        if (this.args && this.args.length > 0) {
          return this.get()+"("+functionCall.argumentString(this.args, options)+")"
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

        return new BoundModule(this.name, this.func, this.dependencies, this.libraryIdentifier, args)
      }

    function argToString(arg) {
      var isBinding = arg && arg.binding && arg.__isFunctionCallBinding

      if (isBinding) {
        return arg.callable()
      } else {
        return JSON.stringify(arg)
      }
    }

    function moduleSource(libraryIdentifier, name, deps, func) {
      var source = libraryIdentifier

      source += ".define("+JSON.stringify(name)+", "

      if (deps.length > 0) {
        source += JSON.stringify(deps)+", "
      }
      source += func.toString()+")"

      return source
    }

    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    return bridgeModule
  }
)